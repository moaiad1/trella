"""Load Saudi regions and cities from JSON into relational tables."""

import json
import logging
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import SaudiCity, SaudiRegion

log = logging.getLogger("trella")


def seed_saudi_geo_if_empty(db: Session) -> None:
    n = db.scalar(select(func.count()).select_from(SaudiRegion))
    if n and n > 0:
        return

    path = Path(__file__).resolve().parent / "data" / "saudi_regions_cities.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    regions = data.get("regions") or []
    for ri, reg in enumerate(regions):
        code = str(reg.get("code", "")).strip()
        name_en = str(reg.get("name_en", "")).strip()
        name_ar = str(reg.get("name_ar", "")).strip()
        if not code or not name_en:
            continue
        row = SaudiRegion(code=code, name_en=name_en, name_ar=name_ar, sort_order=ri)
        db.add(row)
        db.flush()
        cities = reg.get("cities") or []
        for ci, c in enumerate(cities):
            ne = str(c.get("name_en", "")).strip()
            na = str(c.get("name_ar", "")).strip()
            if not ne:
                continue
            db.add(
                SaudiCity(
                    region_id=row.id,
                    name_en=ne,
                    name_ar=na or ne,
                    sort_order=ci,
                )
            )
    db.commit()
    log.info("Saudi regions/cities seeded: %d regions.", len(regions))
