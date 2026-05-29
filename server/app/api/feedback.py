"""Feedback endpoint — purity rating becomes fleet-learning ground truth."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import Feedback, Transaction, User
from app.db.session import get_session
from app.schemas.rest import FeedbackRequest

router = APIRouter(tags=["feedback"])


@router.post("/feedback", status_code=201)
async def submit_feedback(
    body: FeedbackRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    txn = await session.get(Transaction, body.transaction_id)
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your transaction")

    existing = (
        await session.execute(
            select(Feedback).where(Feedback.transaction_id == body.transaction_id)
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Feedback already submitted")

    session.add(
        Feedback(
            transaction_id=body.transaction_id,
            user_id=user.id,
            purity_stars=body.purity_stars,
        )
    )
    await session.commit()
    return {"status": "recorded"}
