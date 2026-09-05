"""Backfill truck_inquiry_messages from legacy inquiry body / seller_reply."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Truck, TruckInquiry, TruckInquiryMessage

log = logging.getLogger("trella")


def backfill_inquiry_messages(db: Session) -> None:
    """Insert message rows for existing inquiries that only had body / seller_reply columns."""
    rows = list(db.scalars(select(TruckInquiry)).all())
    added = 0
    for inv in rows:
        n = db.scalar(
            select(func.count())
            .select_from(TruckInquiryMessage)
            .where(TruckInquiryMessage.inquiry_id == inv.id)
        )
        if (n or 0) > 0:
            continue
        truck = db.get(Truck, inv.truck_id)
        b = (inv.body or "").strip()
        if b:
            db.add(
                TruckInquiryMessage(
                    inquiry_id=inv.id,
                    sender_user_id=inv.buyer_user_id,
                    body=b,
                    created_at=inv.created_at,
                )
            )
            added += 1
        sr = (getattr(inv, "seller_reply", None) or "").strip()
        if sr and truck and truck.user_id:
            ra = inv.replied_at or datetime.now(timezone.utc)
            db.add(
                TruckInquiryMessage(
                    inquiry_id=inv.id,
                    sender_user_id=truck.user_id,
                    body=sr,
                    created_at=ra,
                )
            )
            added += 1
    if added:
        db.commit()
        log.info("Backfilled %s inquiry message row(s) from legacy columns.", added)
    else:
        db.commit()
