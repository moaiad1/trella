import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.geoip import resolve_country
from app.models import PageView, SearchQuery
from app.schemas import PageViewCreate, SearchQueryCreate

router = APIRouter()
log = logging.getLogger(__name__)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else ""


def _resolve_country_bg(page_view_id: int, ip: str) -> None:
    db = SessionLocal()
    try:
        country = resolve_country(db, ip)
        if country:
            pv = db.get(PageView, page_view_id)
            if pv:
                pv.country = country
                db.add(pv)
                db.commit()
    finally:
        db.close()


@router.post("/analytics/pageview", status_code=204)
def track_pageview(
    body: PageViewCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> None:
    ip = _client_ip(request)
    pv = PageView(
        session_id=body.sessionId.strip()[:64],
        path=body.path.strip()[:512],
        referrer=(body.referrer or "").strip()[:512],
        ip_address=ip[:64],
        user_agent=request.headers.get("user-agent", "")[:512],
    )
    db.add(pv)
    db.commit()
    db.refresh(pv)
    background_tasks.add_task(_resolve_country_bg, pv.id, ip)


@router.post("/analytics/search", status_code=204)
def track_search(body: SearchQueryCreate, db: Session = Depends(get_db)) -> None:
    q = body.query.strip()
    if len(q) < 2:
        return
    db.add(SearchQuery(session_id=body.sessionId.strip()[:64], query=q[:256]))
    db.commit()
