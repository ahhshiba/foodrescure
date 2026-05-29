"""Node endpoints — list nodes (with live entropy/health) + detail with foods."""

from __future__ import annotations

from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Food, Node
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

    detail = NodeDetail.model_validate(node)
    detail.entropy = round(sum(food_entropy(f.health) for f in foods if not f.claimed), 4)
    detail.health_avg = _health_avg(foods)
    detail.foods = [FoodOut.model_validate(f) for f in foods]
    return detail
