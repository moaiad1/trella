"""One-time load of reference makes/models from JSON into relational tables."""

import logging
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.catalog import get_reference_catalog
from app.models import VehicleMake, VehicleModel

log = logging.getLogger("trella")


def seed_vehicle_catalog_if_empty(db: Session) -> None:
    """If vehicle_makes is empty, populate from truck_catalog.json (Mercedes-Benz -> Actros, etc.)."""
    n = db.scalar(select(func.count()).select_from(VehicleMake))
    if n and n > 0:
        return

    data = get_reference_catalog()
    for make_name in sorted(data.keys()):
        make_row = VehicleMake(name=make_name)
        db.add(make_row)
        db.flush()
        for model_name in data[make_name]:
            db.add(VehicleModel(make_id=make_row.id, name=model_name))
    db.commit()
    log.info("Vehicle catalog seeded: %d makes from reference JSON.", len(data))
