from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin_user
from app.models import ContactMessage, PageView, SearchQuery, User
from app.schemas import (
    AdminCompanyOut,
    AdminCompanyStatusUpdate,
    AnalyticsCountItem,
    AnalyticsSummaryOut,
    ContactMessageOut,
)

router = APIRouter()


def _admin_company_out(u: User) -> AdminCompanyOut:
    return AdminCompanyOut(
        id=u.id,
        email=u.email,
        firstName=(u.first_name or "").strip(),
        lastName=(u.last_name or "").strip(),
        phone=(u.phone or "").strip(),
        companyName=(u.company_name or "").strip(),
        crNumber=(u.cr_number or "").strip(),
        hasVat=bool(u.has_vat),
        vatNumber=(u.vat_number or "").strip(),
        crDocumentUrl=(u.cr_document_url or "").strip(),
        logoUrl=(u.logo_url or "").strip(),
        repName=(u.rep_name or "").strip(),
        repPhone=(u.rep_phone or "").strip(),
        extraPhones=list(u.extra_phones or []),
        companyStatus=(u.company_status or "pending"),  # type: ignore[arg-type]
        createdAt=u.created_at.isoformat() if u.created_at else "",
    )


@router.get("/companies", response_model=list[AdminCompanyOut])
def list_companies(
    status: Literal["pending", "approved", "rejected"] | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
) -> list[AdminCompanyOut]:
    stmt = select(User).where(User.account_type == "company")
    if status:
        stmt = stmt.where(User.company_status == status)
    stmt = stmt.order_by(User.created_at.desc())
    rows = db.execute(stmt).scalars().all()
    return [_admin_company_out(u) for u in rows]


@router.patch("/companies/{user_id}/status", response_model=AdminCompanyOut)
def update_company_status(
    user_id: int,
    body: AdminCompanyStatusUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
) -> AdminCompanyOut:
    user = db.get(User, user_id)
    if user is None or user.account_type != "company":
        raise HTTPException(status_code=404, detail="Company account not found")
    user.company_status = body.companyStatus
    db.add(user)
    db.commit()
    db.refresh(user)
    return _admin_company_out(user)


def _contact_message_out(m: ContactMessage) -> ContactMessageOut:
    return ContactMessageOut(
        id=m.id,
        name=m.name,
        email=m.email,
        phone=m.phone or "",
        subject=m.subject or "",
        body=m.body,
        isRead=bool(m.is_read),
        createdAt=m.created_at.isoformat() if m.created_at else "",
    )


@router.get("/contact-messages", response_model=list[ContactMessageOut])
def list_contact_messages(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
) -> list[ContactMessageOut]:
    stmt = select(ContactMessage)
    if unread_only:
        stmt = stmt.where(ContactMessage.is_read.is_(False))
    stmt = stmt.order_by(ContactMessage.created_at.desc())
    rows = db.execute(stmt).scalars().all()
    return [_contact_message_out(m) for m in rows]


@router.patch("/contact-messages/{message_id}/read", response_model=ContactMessageOut)
def mark_contact_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
) -> ContactMessageOut:
    m = db.get(ContactMessage, message_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Message not found")
    m.is_read = True
    db.add(m)
    db.commit()
    db.refresh(m)
    return _contact_message_out(m)


@router.get("/analytics/summary", response_model=AnalyticsSummaryOut)
def analytics_summary(
    days: int = 30,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
) -> AnalyticsSummaryOut:
    days = max(1, min(days, 365))
    since = datetime.now(timezone.utc) - timedelta(days=days)

    total_page_views = db.scalar(select(func.count(PageView.id)).where(PageView.created_at >= since)) or 0

    unique_visitors = (
        db.scalar(select(func.count(func.distinct(PageView.session_id))).where(PageView.created_at >= since))
        or 0
    )

    first_seen_subq = (
        select(PageView.session_id, func.min(PageView.created_at).label("first_seen"))
        .group_by(PageView.session_id)
        .subquery()
    )
    sessions_in_range = (
        select(PageView.session_id).where(PageView.created_at >= since).distinct().subquery()
    )
    new_visitors = (
        db.scalar(
            select(func.count())
            .select_from(first_seen_subq)
            .where(first_seen_subq.c.session_id.in_(select(sessions_in_range.c.session_id)))
            .where(first_seen_subq.c.first_seen >= since)
        )
        or 0
    )
    returning_visitors = max(0, unique_visitors - new_visitors)

    top_countries_rows = db.execute(
        select(PageView.country, func.count(PageView.id).label("cnt"))
        .where(PageView.created_at >= since, PageView.country.is_not(None))
        .group_by(PageView.country)
        .order_by(func.count(PageView.id).desc())
        .limit(10)
    ).all()

    top_pages_rows = db.execute(
        select(PageView.path, func.count(PageView.id).label("cnt"))
        .where(PageView.created_at >= since)
        .group_by(PageView.path)
        .order_by(func.count(PageView.id).desc())
        .limit(10)
    ).all()

    top_searches_rows = db.execute(
        select(SearchQuery.query, func.count(SearchQuery.id).label("cnt"))
        .where(SearchQuery.created_at >= since)
        .group_by(SearchQuery.query)
        .order_by(func.count(SearchQuery.id).desc())
        .limit(15)
    ).all()

    daily_rows = db.execute(
        select(
            func.date(PageView.created_at).label("day"),
            func.count(PageView.id).label("views"),
            func.count(func.distinct(PageView.session_id)).label("visitors"),
        )
        .where(PageView.created_at >= since)
        .group_by(func.date(PageView.created_at))
        .order_by(func.date(PageView.created_at))
    ).all()

    recent_rows = (
        db.execute(
            select(PageView)
            .where(PageView.created_at >= since)
            .order_by(PageView.created_at.desc())
            .limit(50)
        )
        .scalars()
        .all()
    )

    return AnalyticsSummaryOut(
        totalPageViews=total_page_views,
        uniqueVisitors=unique_visitors,
        newVisitors=new_visitors,
        returningVisitors=returning_visitors,
        topCountries=[AnalyticsCountItem(label=c or "Unknown", count=n) for c, n in top_countries_rows],
        topPages=[AnalyticsCountItem(label=p, count=n) for p, n in top_pages_rows],
        topSearches=[AnalyticsCountItem(label=q, count=n) for q, n in top_searches_rows],
        dailySeries=[
            {"date": str(d), "views": v, "visitors": u} for d, v, u in daily_rows
        ],
        recentVisits=[
            {
                "ip": r.ip_address,
                "country": r.country or "",
                "path": r.path,
                "createdAt": r.created_at.isoformat() if r.created_at else "",
            }
            for r in recent_rows
        ],
    )
