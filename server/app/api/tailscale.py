"""Tailscale Smart Locker API router.

Exposes the API route for the Raspberry Pi locker control hub to report pickup status.
Coordinates logging and database transaction updates (process_salvage).
"""

from __future__ import annotations

import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Card, Food, User
from app.db.session import get_session
from app.engine import salvage
from app.schemas.mqtt import StatusItem

# Setup logging
log = logging.getLogger("glitch.tailscale")

router = APIRouter(tags=["tailscale"])


class ReportStatusRequest(BaseModel):
    uid: str
    result: str  # "success" or "failed"


@router.post("/api/report_status")
async def report_status(
    body: ReportStatusRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """接收來自地端樹莓派在取貨結束後傳回的 JSON 狀態回報。"""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if body.result == "success":
        # 1. 輸出日誌到伺服器終端機
        print(f"[日誌] [{now_str}] 卡號 {body.uid} 已成功領取貨物，櫃門已安全關閉。")
        log.info("Locker REPORT: card=%s pickup success", body.uid)

        # 2. 尋找擁有該卡片的使用者
        card = (
            await session.execute(select(Card).where(Card.rfid == body.uid))
        ).scalars().first()

        if not card or not card.user_id:
            print(f"[警告] [{now_str}] 收到成功取貨報告，但卡號 {body.uid} 未綁定任何使用者。")
            return {"status": "error", "message": "Card not registered to a user"}

        user = await session.get(User, card.user_id)
        if not user:
            return {"status": "error", "message": "User not found"}

        # 3. 找出該使用者名下的預約剩食項目
        food = (
            await session.execute(
                select(Food).where(Food.reserved_by == user.id, Food.claimed.is_(False))
            )
        ).scalars().first()

        if food:
            # 釋放預約狀態，以便讓 process_salvage 引擎的 mark_foods_claimed 能正確將其歸類為領取
            food.reserved = False
            food.reserved_by = None
            food.reserved_at = None

            # 4. 呼叫結算引擎處理剩食領取與加分，這會同時透過 WebSocket 推送更新給前端 UI
            items = [StatusItem(class_=food.food_class, count=1, confidence=1.0)]
            result = await salvage.process_salvage(
                session, user=user, node_id=food.node_id, items=items
            )
            return {
                "status": "success",
                "message": "交易已結算",
                "gains": result.gains,
                "xp": result.xp,
            }
        else:
            print(f"[警告] [{now_str}] 卡號 {body.uid} 成功取貨，但系統中未找到該使用者的線上預約。")
            return {"status": "ignored", "message": "No active reservation found for this card"}

    elif body.result == "failed":
        # 1. 輸出警告日誌到伺服器終端機
        print(f"[警告] [{now_str}] 卡號 {body.uid} 已刷卡開門，但超音波偵測貨物未被取走！櫃門已強行關閉。")
        log.warning("Locker REPORT: card=%s pickup failed (ultrasonic alert)", body.uid)

        # 2. 自動釋放該使用者的預約，讓其他玩家可以重新預約此剩食
        card = (
            await session.execute(select(Card).where(Card.rfid == body.uid))
        ).scalars().first()

        if card and card.user_id:
            food = (
                await session.execute(
                    select(Food).where(Food.reserved_by == card.user_id, Food.claimed.is_(False))
                )
            ).scalars().first()
            if food:
                food.reserved = False
                food.reserved_by = None
                food.reserved_at = None
                await session.commit()
                log.info("Released reservation for food_id=%s due to pickup failure", food.id)

        return {"status": "success", "message": "警告已記錄，已釋放預約剩食項目。"}

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid result value. Expected 'success' or 'failed'.",
        )
