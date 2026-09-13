import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import resolved_upload_dir, settings
from app.database import SessionLocal, engine
from app.models import Base
from app.routers import admin, ai_listing, analytics, auth, contact, me, seo, trucks
from app.schema_bootstrap import (
    ensure_truck_inquiry_columns,
    ensure_truck_table_columns,
    ensure_user_table_columns,
)
from app.inquiry_chat_bootstrap import backfill_inquiry_messages
from app.seed import seed_if_empty
from app.saudi_geo_seed import seed_saudi_geo_if_empty
from app.vehicle_catalog_seed import seed_vehicle_catalog_if_empty

log = logging.getLogger("trella")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logging.basicConfig(level=logging.INFO)
    Base.metadata.create_all(bind=engine)
    ensure_truck_table_columns(engine)
    ensure_truck_inquiry_columns(engine)
    ensure_user_table_columns(engine)
    db = SessionLocal()
    try:
        seed_vehicle_catalog_if_empty(db)
        seed_saudi_geo_if_empty(db)
        seed_if_empty(db)
        backfill_inquiry_messages(db)
    except Exception:
        log.exception("Demo seed failed — fix DATABASE_URL / permissions or set TRELLA_SEED_DEMO=false")
        raise
    finally:
        db.close()
    yield


app = FastAPI(title="Trucks API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "https://maketsmart.com",
        "https://www.maketsmart.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(trucks.router, prefix="/api/trucks")
app.include_router(me.router, prefix="/api")
app.include_router(ai_listing.router, prefix="/api")
app.include_router(admin.router, prefix="/api/admin")
app.include_router(contact.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(seo.router)

_upload_dir = resolved_upload_dir()
_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(_upload_dir)), name="uploads")


@app.get("/api/features")
def public_features() -> dict[str, bool]:
    """Flags for the client (no auth). Enables listing AI only when the server is configured."""
    return {
        "listingCategoryAi": bool((settings.openai_api_key or "").strip()),
    }


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "Trucks API",
        "docs": "/docs",
        "openapi": "/openapi.json",
        "health": "/health",
        "trucks": "/api/trucks",
        "auth": "/api/auth",
        "ui": "http://127.0.0.1:5173",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
