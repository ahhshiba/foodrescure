"""Node endpoints — list nodes (with live entropy/health) + detail with foods."""

from __future__ import annotations

from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Food, FoodClass, Node
from app.db.session import get_session
from app.engine import entropy
from app.engine.entropy import food_entropy
from app.schemas.rest import FoodOut, NodeDetail, NodeOut

router = APIRouter(prefix="/nodes", tags=["nodes"])


def _health_avg(foods: Sequence[Food]) -> float:
    unclaimed = [f for f in foods if not f.claimed]
    if not unclaimed:
        return 0.0
    return round(sum(f.health for f in unclaimed) / len(unclaimed), 2)


@router.get("", response_model=list[NodeOut])
async def list_nodes(session: AsyncSession = Depends(get_session)) -> list[NodeOut]:
    nodes = (await session.execute(select(Node))).scalars().all()
    ent = await entropy.compute_entropy(session)

    foods = (await session.execute(select(Food).where(Food.claimed.is_(False)))).scalars().all()
    by_node: dict[str, list[Food]] = {}
    for f in foods:
        by_node.setdefault(f.node_id, []).append(f)

    out: list[NodeOut] = []
    for node in nodes:
        model = NodeOut.model_validate(node)
        model.entropy = ent.per_node.get(node.id, 0.0)
        model.health_avg = _health_avg(by_node.get(node.id, []))
        out.append(model)
    return out


@router.get("/{node_id}", response_model=NodeDetail)
async def get_node(node_id: str, session: AsyncSession = Depends(get_session)) -> NodeDetail:
    node = await session.get(Node, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    foods = (await session.execute(select(Food).where(Food.node_id == node_id))).scalars().all()

    zh: dict[str, str] = {
        row[0]: row[1]
        for row in (
            await session.execute(select(FoodClass.class_name, FoodClass.display_name_zh))
        ).all()
    }

    out_foods: list[FoodOut] = []
    for f in foods:
        fo = FoodOut.model_validate(f)
        fo.display_name_zh = zh.get(f.food_class) or None
        out_foods.append(fo)

    # Validate the base via NodeOut (no `foods` relationship -> no async lazy-load),
    # then compose the detail with the eagerly-built food list.
    detail = NodeDetail(**NodeOut.model_validate(node).model_dump(), foods=out_foods)
    detail.entropy = round(sum(food_entropy(f.health) for f in foods if not f.claimed), 4)
    detail.health_avg = _health_avg(foods)
    return detail


import logging
import httpx
from datetime import UTC, datetime
from app.api.deps import get_current_user
from app.db.models import Card, User

log = logging.getLogger("glitch.nodes")


@router.post("/{node_id}/reserve")
async def reserve_node_food(
    node_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """線上預約剩食，預約成功後會主動發送 HTTP POST 把使用者卡片 UID 傳給對應樹莓派的 IP。"""
    node = await session.get(Node, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    if node.status != "online":
        raise HTTPException(status_code=400, detail="Node is offline")

    # 1. 取得使用者綁定的卡片 RFID UID
    card = (
        await session.execute(
            select(Card).where(Card.user_id == user.id)
        )
    ).scalars().first()
    if card is None:
        raise HTTPException(
            status_code=400,
            detail="您的帳號尚未綁定 RFID 卡片。請先至設定或刷卡註冊卡片。"
        )

    # 2. 檢查使用者是否已有尚未領取且未過期的預約
    existing_res = (
        await session.execute(
            select(Food).where(Food.reserved_by == user.id, Food.claimed.is_(False))
        )
    ).scalars().first()
    if existing_res is not None:
        raise HTTPException(
            status_code=400,
            detail=f"您在節點 {existing_res.node_id} 已有預約中的剩食項目，請先領取或取消該預約。"
        )

    # 3. 找出該節點內，健康值最低（最緊急需要被拯救）且未被預約/領取的食物
    food = (
        await session.execute(
            select(Food)
            .where(Food.node_id == node_id, Food.claimed.is_(False), Food.reserved.is_(False))
            .order_by(Food.health.asc())
            .limit(1)
        )
    ).scalars().first()
    if food is None:
        raise HTTPException(status_code=404, detail="該節點目前沒有可預約的剩食項目")

    # 4. 標記為預約狀態
    food.reserved = True
    food.reserved_by = user.id
    food.reserved_at = datetime.now(UTC)
    await session.commit()

    log.info("USER=%s reserved FOOD=%s at NODE=%s. Card RFID=%s", user.username, food.id, node_id, card.rfid)

    # 5. 主動推送預約的卡片 UID 給對應的樹莓派 (Tailscale IP)
    if node.tailscale_ip:
        # 本地測試時使用 8001 埠口避免與本伺服器的 8000 衝突
        port = 8001 if node.tailscale_ip in ("127.0.0.1", "localhost", "host.docker.internal") else 8000
        target_url = f"http://{node.tailscale_ip}:{port}/api/reserve"
        log.info("Sending reservation to Raspberry Pi via Tailscale: POST %s", target_url)
        try:
            async with httpx.AsyncClient() as client:
                # 設為 2 秒超時，避免樹莓派未開機時卡死後端
                resp = await client.post(
                    target_url,
                    json={"uid": card.rfid},
                    timeout=2.0
                )
                if resp.status_code == 200:
                    log.info("Successfully notified locker IP=%s of reservation for card=%s", node.tailscale_ip, card.rfid)
                else:
                    log.warning("Locker IP=%s returned status %d for reservation", node.tailscale_ip, resp.status_code)
        except Exception as exc:
            log.warning("Failed to connect to locker IP=%s: %s", node.tailscale_ip, exc)
    else:
        log.info("No tailscale_ip configured for node %s, skipping Raspberry Pi HTTP notification", node_id)

    return {
        "status": "success",
        "message": "預約成功！請在 15 分鐘內到機台前刷卡取貨。",
        "uid": card.rfid,
        "food_id": food.id,
        "food_class": food.food_class,
    }


@router.post("/{node_id}/cancel_reservation")
async def cancel_reservation(
    node_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """取消該節點的線上預約。"""
    food = (
        await session.execute(
            select(Food).where(
                Food.node_id == node_id,
                Food.reserved_by == user.id,
                Food.claimed.is_(False)
            )
        )
    ).scalars().first()
    if food is None:
        raise HTTPException(status_code=404, detail="在此節點未找到您的預約項目")

    food.reserved = False
    food.reserved_by = None
    food.reserved_at = None
    
    # 找出該節點的 Pi IP 並傳送 clear_reserve
    node = await session.get(Node, node_id)
    if node and node.tailscale_ip:
        port = 8001 if node.tailscale_ip in ("127.0.0.1", "localhost", "host.docker.internal") else 8000
        target_url = f"http://{node.tailscale_ip}:{port}/api/clear_reserve"
        try:
            async with httpx.AsyncClient() as client:
                await client.post(target_url, timeout=2.0)
                log.info("Sent clear_reserve to Pi %s", node.tailscale_ip)
        except Exception as exc:
            log.warning("Failed to send clear_reserve to Pi %s: %s", node.tailscale_ip, exc)
            
    await session.commit()
    log.info("USER=%s cancelled reservation at NODE=%s", user.username, node_id)
    return {"status": "success", "message": "預約已成功取消。"}


from pydantic import BaseModel

class PiResult(BaseModel):
    uid: str
    result: str

@router.post("/{node_id}/pickup_result")
async def pickup_result(
    node_id: str,
    payload: PiResult,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """樹莓派回傳的取貨結果"""
    # 1. 根據 UID 找卡片與使用者
    card = (await session.execute(select(Card).where(Card.rfid == payload.uid))).scalars().first()
    if not card or not card.user_id:
        raise HTTPException(status_code=404, detail="Card not found or not claimed")
    
    # 2. 尋找此使用者的有效預約
    food = (
        await session.execute(
            select(Food).where(
                Food.node_id == node_id, 
                Food.reserved_by == card.user_id,
                Food.claimed.is_(False)
            )
        )
    ).scalars().first()
    
    if not food:
        return {"status": "ok", "message": "No active reservation"}
        
    if payload.result == "success":
        import uuid
        from app.engine import salvage as salvage_engine
        from app.schemas.mqtt import StatusItem
        from app.ws.manager import manager
        from app.ws.events import envelope
        from app.schemas.ws import UnlockSuccess
        
        # Build items for engine
        items = [StatusItem.model_validate({"class": food.food_class, "count": 1, "confidence": 1.0})]
        txn_id = f"txn-{uuid.uuid4().hex[:16]}"
        
        # Trigger unlock animation
        await manager.send_to_user(
            card.user_id, envelope("unlock_success", UnlockSuccess(txn_id=txn_id, node_id=node_id))
        )
        
        # Settle economy and trigger credit animation
        user_obj = await session.get(User, card.user_id)
        if user_obj:
            await salvage_engine.process_salvage(session, user=user_obj, node_id=node_id, items=items, txn_id=txn_id)
            
        log.info(f"USER={card.user_id} successfully picked up FOOD={food.id} at NODE={node_id}")
    else:
        # 取貨失敗，將預約取消
        food.reserved = False
        food.reserved_by = None
        food.reserved_at = None
        await session.commit()
        log.info(f"USER={card.user_id} pickup failed at NODE={node_id}, reservation cancelled")
        
    return {"status": "success"}
