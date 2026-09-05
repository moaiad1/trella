from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin_user
from app.models import User
from app.schemas import AdminCompanyOut, AdminCompanyStatusUpdate

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
