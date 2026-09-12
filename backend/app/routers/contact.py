from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ContactMessage
from app.schemas import ContactMessageCreate

router = APIRouter()


@router.post("/contact", status_code=201)
def submit_contact_message(
    body: ContactMessageCreate,
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    row = ContactMessage(
        name=body.name.strip(),
        email=str(body.email).strip().lower(),
        phone=body.phone.strip(),
        subject=body.subject.strip(),
        body=body.body.strip(),
    )
    db.add(row)
    db.commit()
    return {"ok": True}
