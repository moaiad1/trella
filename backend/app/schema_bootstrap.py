"""Ensure DB schema matches current models (adds missing columns on older databases)."""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_truck_table_columns(engine: Engine) -> None:
    insp = inspect(engine)
    if not insp.has_table("trucks"):
        return
    cols = {c["name"] for c in insp.get_columns("trucks")}
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if "user_id" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE trucks ADD COLUMN user_id INTEGER"))
            else:
                conn.execute(text("ALTER TABLE trucks ADD COLUMN user_id INT NULL"))
        if "seller_phone" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE trucks ADD COLUMN seller_phone VARCHAR(32)"))
            else:
                conn.execute(text("ALTER TABLE trucks ADD COLUMN seller_phone VARCHAR(32) NULL"))
        if "city_id" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE trucks ADD COLUMN city_id INTEGER"))
            else:
                conn.execute(text("ALTER TABLE trucks ADD COLUMN city_id INT NULL"))
        if "video_url" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE trucks ADD COLUMN video_url VARCHAR(512)"))
            else:
                conn.execute(text("ALTER TABLE trucks ADD COLUMN video_url VARCHAR(512) NULL"))
        if "listing_status" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE trucks ADD COLUMN listing_status VARCHAR(16) DEFAULT 'active'"))
            else:
                conn.execute(text("ALTER TABLE trucks ADD COLUMN listing_status VARCHAR(16) NOT NULL DEFAULT 'active'"))


def ensure_user_table_columns(engine: Engine) -> None:
    insp = inspect(engine)
    if not insp.has_table("users"):
        return
    cols = {c["name"] for c in insp.get_columns("users")}
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if "first_name" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN first_name VARCHAR(128) DEFAULT ''"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN first_name VARCHAR(128) NOT NULL DEFAULT ''"))
        if "last_name" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN last_name VARCHAR(128) DEFAULT ''"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN last_name VARCHAR(128) NOT NULL DEFAULT ''"))
        if "phone" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(32) DEFAULT ''"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(32) NOT NULL DEFAULT ''"))
        if "account_type" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN account_type VARCHAR(16) DEFAULT 'individual'"))
            else:
                conn.execute(
                    text("ALTER TABLE users ADD COLUMN account_type VARCHAR(16) NOT NULL DEFAULT 'individual'")
                )
        if "company_name" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN company_name VARCHAR(256) DEFAULT ''"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN company_name VARCHAR(256) NOT NULL DEFAULT ''"))
        if "cr_number" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN cr_number VARCHAR(16) DEFAULT ''"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN cr_number VARCHAR(16) NOT NULL DEFAULT ''"))
        if "has_vat" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN has_vat BOOLEAN DEFAULT 0"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN has_vat BOOLEAN NOT NULL DEFAULT 0"))
        if "vat_number" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN vat_number VARCHAR(16) DEFAULT ''"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN vat_number VARCHAR(16) NOT NULL DEFAULT ''"))
        if "logo_url" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN logo_url VARCHAR(512) DEFAULT ''"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN logo_url VARCHAR(512) NOT NULL DEFAULT ''"))
        if "extra_phones" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN extra_phones TEXT"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN extra_phones JSON NULL"))
        if "rep_name" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN rep_name VARCHAR(256) DEFAULT ''"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN rep_name VARCHAR(256) NOT NULL DEFAULT ''"))
        if "rep_phone" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN rep_phone VARCHAR(32) DEFAULT ''"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN rep_phone VARCHAR(32) NOT NULL DEFAULT ''"))
        if "cr_document_url" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN cr_document_url VARCHAR(512) DEFAULT ''"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN cr_document_url VARCHAR(512) NOT NULL DEFAULT ''"))
        if "terms_accepted" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN terms_accepted BOOLEAN DEFAULT 0"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN terms_accepted BOOLEAN NOT NULL DEFAULT 0"))
        if "is_admin" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0"))
        if "company_status" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE users ADD COLUMN company_status VARCHAR(16) DEFAULT 'approved'"))
            else:
                conn.execute(
                    text("ALTER TABLE users ADD COLUMN company_status VARCHAR(16) NOT NULL DEFAULT 'approved'")
                )


def ensure_truck_inquiry_columns(engine: Engine) -> None:
    insp = inspect(engine)
    if not insp.has_table("truck_inquiries"):
        return
    cols = {c["name"] for c in insp.get_columns("truck_inquiries")}
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if "seller_reply" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE truck_inquiries ADD COLUMN seller_reply TEXT"))
            else:
                conn.execute(text("ALTER TABLE truck_inquiries ADD COLUMN seller_reply TEXT NULL"))
        if "replied_at" not in cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE truck_inquiries ADD COLUMN replied_at DATETIME"))
            else:
                conn.execute(text("ALTER TABLE truck_inquiries ADD COLUMN replied_at DATETIME NULL"))
