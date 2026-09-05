#!/usr/bin/env python3
"""
Load demo user + trucks if the trucks table is empty.
Run from the backend directory with the venv activated:

  cd backend && . .venv/bin/activate && python scripts/seed_database.py

Uses DATABASE_URL / .env the same way as uvicorn.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

# Allow running as `python scripts/seed_database.py` from backend/
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("trella")

from app.database import SessionLocal, engine  # noqa: E402
from app.models import Base  # noqa: E402
from app.schema_bootstrap import ensure_truck_table_columns  # noqa: E402
from app.seed import seed_if_empty  # noqa: E402


def main() -> None:
    log.info("Database URL driver: %s", engine.url.drivername)
    Base.metadata.create_all(bind=engine)
    ensure_truck_table_columns(engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    log.info("Done.")


if __name__ == "__main__":
    main()
