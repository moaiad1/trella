from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user_required
from app.models import InquiryReadState, Truck, TruckInquiry, TruckInquiryMessage, User
from app.schemas import (
    BuyerInquiryOut,
    ChatMessageCreate,
    ChatMessageOut,
    ChatThreadsResponse,
    ChatThreadSummary,
    InquiryContextOut,
    SellerInquiryOut,
    TruckOut,
    listing_ref_no,
    truck_to_out,
)

router = APIRouter(tags=["me"])


def _assert_inquiry_access(inv: TruckInquiry, truck: Truck | None, user: User) -> None:
    if truck is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    if inv.buyer_user_id == user.id:
        return
    if truck.user_id == user.id:
        return
    raise HTTPException(status_code=403, detail="Not part of this conversation")


def _unread_count(db: Session, inquiry_id: int, user_id: int) -> int:
    row = db.get(InquiryReadState, (inquiry_id, user_id))
    last_read = row.last_read_at if row else None
    q = (
        select(func.count())
        .select_from(TruckInquiryMessage)
        .where(
            TruckInquiryMessage.inquiry_id == inquiry_id,
            TruckInquiryMessage.sender_user_id != user_id,
        )
    )
    if last_read is not None:
        q = q.where(TruckInquiryMessage.created_at > last_read)
    return int(db.scalar(q) or 0)


def _last_message_info(
    db: Session, inquiry_id: int, inv: TruckInquiry
) -> tuple[str, str]:
    msg = db.execute(
        select(TruckInquiryMessage)
        .where(TruckInquiryMessage.inquiry_id == inquiry_id)
        .order_by(TruckInquiryMessage.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    if msg is not None:
        prev = (msg.body or "").strip()
        if len(prev) > 120:
            prev = prev[:117] + "..."
        t = msg.created_at.isoformat() if msg.created_at else ""
        return (prev or "…", t)
    b = (inv.body or "").strip()
    if len(b) > 120:
        b = b[:117] + "..."
    return (b or "…", inv.created_at.isoformat() if inv.created_at else "")


def _seller_inquiry_out(
    db: Session, inv: TruckInquiry, truck: Truck, buyer: User, current_user_id: int
) -> SellerInquiryOut:
    label = f"{truck.year} {truck.make} {truck.model}"
    preview, last_at = _last_message_info(db, inv.id, inv)
    unread = _unread_count(db, inv.id, current_user_id)
    return SellerInquiryOut(
        id=inv.id,
        truckId=str(truck.id),
        truckLabel=label,
        truckRefNo=listing_ref_no(truck.id),
        buyerEmail=buyer.email,
        createdAt=inv.created_at.isoformat() if inv.created_at else "",
        lastMessagePreview=preview,
        lastMessageAt=last_at,
        unreadCount=unread,
    )


def _buyer_inquiry_out(
    db: Session, inv: TruckInquiry, truck: Truck, current_user_id: int
) -> BuyerInquiryOut:
    label = f"{truck.year} {truck.make} {truck.model}"
    preview, last_at = _last_message_info(db, inv.id, inv)
    unread = _unread_count(db, inv.id, current_user_id)
    return BuyerInquiryOut(
        id=inv.id,
        truckId=str(truck.id),
        truckLabel=label,
        truckRefNo=listing_ref_no(truck.id),
        createdAt=inv.created_at.isoformat() if inv.created_at else "",
        lastMessagePreview=preview,
        lastMessageAt=last_at,
        unreadCount=unread,
    )


@router.get("/me/listings", response_model=list[TruckOut])
def my_listings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
) -> list[TruckOut]:
    rows = db.execute(
        select(Truck)
        .where(Truck.user_id == current_user.id)
        .order_by(Truck.id.desc())
    ).scalars().all()
    return [truck_to_out(t, db) for t in rows]


@router.get("/me/seller-inquiries", response_model=list[SellerInquiryOut])
def list_seller_inquiries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
) -> list[SellerInquiryOut]:
    stmt = (
        select(TruckInquiry, Truck, User)
        .join(Truck, TruckInquiry.truck_id == Truck.id)
        .join(User, TruckInquiry.buyer_user_id == User.id)
        .where(Truck.user_id == current_user.id)
        .order_by(TruckInquiry.created_at.desc())
    )
    rows = db.execute(stmt).all()
    return [
        _seller_inquiry_out(db, inv, truck, buyer, current_user.id)
        for inv, truck, buyer in rows
    ]


@router.get("/me/buyer-inquiries", response_model=list[BuyerInquiryOut])
def list_buyer_inquiries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
) -> list[BuyerInquiryOut]:
    stmt = (
        select(TruckInquiry, Truck)
        .join(Truck, TruckInquiry.truck_id == Truck.id)
        .where(TruckInquiry.buyer_user_id == current_user.id)
        .order_by(TruckInquiry.created_at.desc())
    )
    rows = db.execute(stmt).all()
    return [
        _buyer_inquiry_out(db, inv, truck, current_user.id) for inv, truck in rows
    ]


@router.get("/me/chat-threads", response_model=ChatThreadsResponse)
def list_chat_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
) -> ChatThreadsResponse:
    seller_stmt = (
        select(TruckInquiry, Truck, User)
        .join(Truck, TruckInquiry.truck_id == Truck.id)
        .join(User, TruckInquiry.buyer_user_id == User.id)
        .where(Truck.user_id == current_user.id)
    )
    buyer_stmt = (
        select(TruckInquiry, Truck)
        .join(Truck, TruckInquiry.truck_id == Truck.id)
        .where(TruckInquiry.buyer_user_id == current_user.id)
    )
    threads: list[ChatThreadSummary] = []
    for inv, truck, buyer in db.execute(seller_stmt).all():
        preview, last_at = _last_message_info(db, inv.id, inv)
        unread = _unread_count(db, inv.id, current_user.id)
        threads.append(
            ChatThreadSummary(
                inquiryId=inv.id,
                truckId=str(truck.id),
                truckLabel=f"{truck.year} {truck.make} {truck.model}",
                truckRefNo=listing_ref_no(truck.id),
                preview=preview,
                lastMessageAt=last_at,
                unreadCount=unread,
                role="seller",
                buyerEmail=buyer.email,
            )
        )
    for inv, truck in db.execute(buyer_stmt).all():
        preview, last_at = _last_message_info(db, inv.id, inv)
        unread = _unread_count(db, inv.id, current_user.id)
        threads.append(
            ChatThreadSummary(
                inquiryId=inv.id,
                truckId=str(truck.id),
                truckLabel=f"{truck.year} {truck.make} {truck.model}",
                truckRefNo=listing_ref_no(truck.id),
                preview=preview,
                lastMessageAt=last_at,
                unreadCount=unread,
                role="buyer",
                buyerEmail=None,
            )
        )
    threads.sort(key=lambda x: x.lastMessageAt or "", reverse=True)
    total = sum(t.unreadCount for t in threads)
    return ChatThreadsResponse(totalUnread=total, threads=threads)


@router.get("/me/inquiries/{inquiry_id}/context", response_model=InquiryContextOut)
def get_inquiry_context(
    inquiry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
) -> InquiryContextOut:
    inv = db.get(TruckInquiry, inquiry_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    truck = db.get(Truck, inv.truck_id)
    _assert_inquiry_access(inv, truck, current_user)
    label = f"{truck.year} {truck.make} {truck.model}"
    role: Literal["seller", "buyer"] = (
        "buyer" if inv.buyer_user_id == current_user.id else "seller"
    )
    return InquiryContextOut(
        truckId=str(truck.id),
        truckLabel=label,
        truckRefNo=listing_ref_no(truck.id),
        role=role,
    )


@router.get("/me/inquiries/{inquiry_id}/messages", response_model=list[ChatMessageOut])
def list_inquiry_messages(
    inquiry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
) -> list[ChatMessageOut]:
    inv = db.get(TruckInquiry, inquiry_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    truck = db.get(Truck, inv.truck_id)
    _assert_inquiry_access(inv, truck, current_user)
    msgs = db.execute(
        select(TruckInquiryMessage)
        .where(TruckInquiryMessage.inquiry_id == inquiry_id)
        .order_by(TruckInquiryMessage.created_at)
    ).scalars().all()
    out: list[ChatMessageOut] = []
    for m in msgs:
        sender = db.get(User, m.sender_user_id)
        out.append(
            ChatMessageOut(
                id=m.id,
                senderUserId=m.sender_user_id,
                senderEmail=sender.email if sender else "",
                body=m.body,
                createdAt=m.created_at.isoformat() if m.created_at else "",
            )
        )
    return out


@router.post(
    "/me/inquiries/{inquiry_id}/messages",
    response_model=ChatMessageOut,
    status_code=201,
)
def post_inquiry_message(
    inquiry_id: int,
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
) -> ChatMessageOut:
    inv = db.get(TruckInquiry, inquiry_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    truck = db.get(Truck, inv.truck_id)
    _assert_inquiry_access(inv, truck, current_user)
    text = payload.body.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    row = TruckInquiryMessage(
        inquiry_id=inv.id,
        sender_user_id=current_user.id,
        body=text,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ChatMessageOut(
        id=row.id,
        senderUserId=row.sender_user_id,
        senderEmail=current_user.email,
        body=row.body,
        createdAt=row.created_at.isoformat() if row.created_at else "",
    )


@router.post("/me/inquiries/{inquiry_id}/read", status_code=204)
def mark_inquiry_read(
    inquiry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
) -> Response:
    inv = db.get(TruckInquiry, inquiry_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    truck = db.get(Truck, inv.truck_id)
    _assert_inquiry_access(inv, truck, current_user)
    now = datetime.now(timezone.utc)
    row = db.get(InquiryReadState, (inquiry_id, current_user.id))
    if row is None:
        db.add(InquiryReadState(inquiry_id=inquiry_id, user_id=current_user.id, last_read_at=now))
    else:
        row.last_read_at = now
    db.commit()
    return Response(status_code=204)
