from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Truck

router = APIRouter()

SITE_URL = "https://maketsmart.com"
STATIC_PATHS = ["", "inventory", "contact"]


@router.get("/sitemap.xml", include_in_schema=False)
def sitemap(db: Session = Depends(get_db)) -> Response:
    urls = [f"{SITE_URL}/{p}" for p in STATIC_PATHS]
    truck_ids = db.scalars(
        select(Truck.id).where(Truck.listing_status.in_(["active", "reserved"]))
    ).all()
    urls += [f"{SITE_URL}/truck/{tid}" for tid in truck_ids]

    body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        body.append(f"  <url><loc>{u}</loc></url>")
    body.append("</urlset>")
    return Response("\n".join(body), media_type="application/xml")
