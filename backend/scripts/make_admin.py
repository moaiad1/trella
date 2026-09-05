#!/usr/bin/env python3
"""
Grant (or revoke) admin access for a user by email.

Run from the backend directory with the venv activated:

  cd backend && . .venv/bin/activate && python scripts/make_admin.py user@example.com
  cd backend && . .venv/bin/activate && python scripts/make_admin.py user@example.com --revoke

Uses DATABASE_URL / .env the same way as uvicorn.
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("trella")

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import User  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("email", help="Email of the user to promote/demote")
    parser.add_argument("--revoke", action="store_true", help="Remove admin access instead of granting it")
    args = parser.parse_args()

    email = args.email.strip().lower()
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            log.error("No user found with email %s", email)
            sys.exit(1)
        user.is_admin = not args.revoke
        db.add(user)
        db.commit()
        log.info(
            "%s is now %s",
            email,
            "an admin" if user.is_admin else "no longer an admin",
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
