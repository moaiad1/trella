import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.catalog import catalog_make_names, catalog_models_for_make
from app.config import resolved_upload_dir, settings
from app.database import get_db
from app.deps import get_current_user_required
from app.models import SaudiCity, SaudiRegion, Truck, TruckInquiry, TruckInquiryMessage, User, VehicleMake, VehicleModel
from app.schemas import (
    InquiryCreate,
    ListingStatusUpdate,
    SaudiLocationCity,
    SaudiLocationRegion,
    SaudiCityWithRegion,
    TruckCreate,
    TruckOut,
    TruckUpdate,
    truck_to_out,
)

router = APIRouter()

_MIME_EXT: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    # Also used for uploading documents (e.g. commercial registration certificates).
    "application/pdf": ".pdf",
}

_VIDEO_MIME: dict[str, str] = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}


@router.post("/upload-image")
async def upload_truck_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_required),
) -> dict[str, str]:
    """Save a listing image to disk and return a URL path served under /api/uploads/."""
    raw = await file.read()
    if len(raw) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="File too large")
    ct = (file.content_type or "").split(";")[0].strip().lower()
    ext = _MIME_EXT.get(ct)
    if not ext:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, WebP, GIF images or PDF documents are allowed",
        )
    name = f"{uuid.uuid4().hex}{ext}"
    dest = resolved_upload_dir() / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(raw)
    return {"url": f"/api/uploads/{name}"}


@router.post("/upload-video")
async def upload_truck_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_required),
) -> dict[str, str]:
    """Save an optional listing video to disk; larger limit than images."""
    raw = await file.read()
    if len(raw) > settings.max_video_bytes:
        raise HTTPException(status_code=413, detail="Video file too large")
    ct = (file.content_type or "").split(";")[0].strip().lower()
    ext = _VIDEO_MIME.get(ct)
    if not ext:
        raise HTTPException(
            status_code=400,
            detail="Only MP4, WebM, or QuickTime (.mov) video is allowed",
        )
    name = f"{uuid.uuid4().hex}{ext}"
    dest = resolved_upload_dir() / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(raw)
    return {"url": f"/api/uploads/{name}"}


@router.get("/catalog/makes", response_model=list[str])
def list_vehicle_makes_catalog(db: Session = Depends(get_db)) -> list[str]:
    """Manufacturer names from the `vehicle_makes` table (relational reference catalog)."""
    rows = db.execute(select(VehicleMake.name).order_by(VehicleMake.name)).scalars().all()
    return [str(x).strip() for x in rows if x and str(x).strip()]


@router.get("/catalog/models", response_model=list[str])
def list_vehicle_models_catalog(
    make: str | None = Query(None, description="Manufacturer name (case-insensitive)"),
    db: Session = Depends(get_db),
) -> list[str]:
    """Model names from `vehicle_models` for the given make."""
    if not make or not make.strip():
        return []
    m = make.strip()
    make_row = db.execute(
        select(VehicleMake).where(func.lower(VehicleMake.name) == m.lower())
    ).scalar_one_or_none()
    if make_row is None:
        return []
    rows = db.execute(
        select(VehicleModel.name)
        .where(VehicleModel.make_id == make_row.id)
        .order_by(VehicleModel.name)
    ).scalars().all()
    return [str(x).strip() for x in rows if x and str(x).strip()]


@router.get("/locations/regions", response_model=list[SaudiLocationRegion])
def list_saudi_regions(db: Session = Depends(get_db)) -> list[SaudiLocationRegion]:
    rows = db.execute(
        select(SaudiRegion).order_by(SaudiRegion.sort_order, SaudiRegion.id)
    ).scalars().all()
    return [
        SaudiLocationRegion(id=r.id, nameEn=r.name_en, nameAr=r.name_ar) for r in rows
    ]


@router.get("/locations/cities", response_model=list[SaudiLocationCity])
def list_saudi_cities(
    region_id: int = Query(..., alias="regionId", description="Saudi region id"),
    db: Session = Depends(get_db),
) -> list[SaudiLocationCity]:
    rows = db.execute(
        select(SaudiCity)
        .where(SaudiCity.region_id == region_id)
        .order_by(SaudiCity.sort_order, SaudiCity.name_en)
    ).scalars().all()
    return [
        SaudiLocationCity(id=c.id, nameEn=c.name_en, nameAr=c.name_ar) for c in rows
    ]


@router.get("/locations/city/{city_id}", response_model=SaudiCityWithRegion)
def get_saudi_city(
    city_id: int,
    db: Session = Depends(get_db),
) -> SaudiCityWithRegion:
    c = db.get(SaudiCity, city_id)
    if c is None:
        raise HTTPException(status_code=404, detail="City not found")
    return SaudiCityWithRegion(
        id=c.id,
        nameEn=c.name_en,
        nameAr=c.name_ar,
        regionId=c.region_id,
    )


@router.get("", response_model=list[TruckOut])
def list_trucks(db: Session = Depends(get_db)) -> list[TruckOut]:
    rows = db.execute(
        select(Truck)
        .where(or_(Truck.listing_status.is_(None), Truck.listing_status != "sold"))
        .order_by(Truck.id.desc())
    ).scalars().all()
    return [truck_to_out(t, db) for t in rows]


@router.get("/meta/makes", response_model=list[str])
def list_distinct_makes(db: Session = Depends(get_db)) -> list[str]:
    """Inventory makes plus relational reference + JSON catalog."""
    rows = db.execute(select(Truck.make).distinct()).scalars().all()
    from_db = {m.strip() for m in rows if m and m.strip()}
    ref_names = db.execute(select(VehicleMake.name)).scalars().all()
    from_tables = {str(x).strip() for x in ref_names if x and str(x).strip()}
    merged = from_db | from_tables | catalog_make_names()
    return sorted(merged)


@router.get("/meta/models", response_model=list[str])
def list_distinct_models(
    make: str | None = Query(None, description="Only models for this make"),
    db: Session = Depends(get_db),
) -> list[str]:
    if not make or not make.strip():
        return []
    m = make.strip()
    rows = db.execute(
        select(Truck.model).distinct().where(func.lower(Truck.make) == m.lower())
    ).scalars().all()
    from_db = {x.strip() for x in rows if x and x.strip()}
    from_json = catalog_models_for_make(m)
    make_row = db.execute(
        select(VehicleMake).where(func.lower(VehicleMake.name) == m.lower())
    ).scalar_one_or_none()
    from_tables: set[str] = set()
    if make_row is not None:
        model_rows = db.execute(
            select(VehicleModel.name).where(VehicleModel.make_id == make_row.id)
        ).scalars().all()
        from_tables = {str(x).strip() for x in model_rows if x and str(x).strip()}
    merged = from_db | from_json | from_tables
    return sorted(merged)


@router.post("/{truck_id}/inquiries", status_code=201)
def create_truck_inquiry(
    truck_id: int,
    payload: InquiryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
) -> dict[str, int]:
    truck = db.get(Truck, truck_id)
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    st = (getattr(truck, "listing_status", None) or "active").strip().lower()
    if st != "active":
        raise HTTPException(
            status_code=400,
            detail="Messaging is not available for this listing",
        )
    if truck.user_id is None:
        raise HTTPException(status_code=400, detail="This listing cannot receive messages")
    if truck.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message your own listing")
    text = payload.body.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    row = TruckInquiry(truck_id=truck_id, buyer_user_id=current_user.id, body=text)
    db.add(row)
    db.flush()
    db.add(
        TruckInquiryMessage(
            inquiry_id=row.id,
            sender_user_id=current_user.id,
            body=text,
        )
    )
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.get("/{truck_id}", response_model=TruckOut)
def get_truck(truck_id: int, db: Session = Depends(get_db)) -> TruckOut:
    t = db.get(Truck, truck_id)
    if not t:
        raise HTTPException(status_code=404, detail="Truck not found")
    return truck_to_out(t, db)


@router.post("", response_model=TruckOut, status_code=201)
def create_truck(
    body: TruckCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
) -> TruckOut:
    if current_user.account_type == "company" and current_user.company_status != "approved":
        raise HTTPException(
            status_code=403,
            detail="Your company account is pending admin approval before you can list vehicles",
        )
    city = db.get(SaudiCity, body.city_id)
    if not city:
        raise HTTPException(status_code=400, detail="Invalid city")
    region = db.get(SaudiRegion, city.region_id)
    if not region:
        raise HTTPException(status_code=400, detail="Invalid region")
    location_str = f"{city.name_en}, {region.name_en}"
    row = Truck(
        user_id=current_user.id,
        seller_phone=body.sellerPhone.strip(),
        make=body.make,
        model=body.model,
        year=body.year,
        price=body.price,
        mileage=body.mileage,
        truck_type=body.type,
        condition=body.condition,
        transmission=body.transmission,
        fuel_type=body.fuelType,
        city_id=city.id,
        location=location_str,
        seller=body.seller,
        seller_name=body.sellerName,
        description=(body.description or "").strip(),
        features=body.features,
        images=body.images,
        video_url=body.video_url,
        listing_status="active",
        date_added=date.today(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return truck_to_out(row, db)


@router.patch("/{truck_id}/listing-status", response_model=TruckOut)
def patch_listing_status(
    truck_id: int,
    body: ListingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
) -> TruckOut:
    row = db.get(Truck, truck_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Truck not found")
    if row.user_id is None or row.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your listing")
    row.listing_status = body.listing_status
    db.commit()
    db.refresh(row)
    return truck_to_out(row, db)


@router.put("/{truck_id}", response_model=TruckOut)
def update_truck(
    truck_id: int,
    body: TruckUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
) -> TruckOut:
    row = db.get(Truck, truck_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Truck not found")
    if row.user_id is None or row.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your listing")
    city = db.get(SaudiCity, body.city_id)
    if not city:
        raise HTTPException(status_code=400, detail="Invalid city")
    region = db.get(SaudiRegion, city.region_id)
    if not region:
        raise HTTPException(status_code=400, detail="Invalid region")
    location_str = f"{city.name_en}, {region.name_en}"
    row.seller_phone = body.sellerPhone.strip()
    row.make = body.make
    row.model = body.model
    row.year = body.year
    row.price = body.price
    row.mileage = body.mileage
    row.truck_type = body.type
    row.condition = body.condition
    row.transmission = body.transmission
    row.fuel_type = body.fuelType
    row.city_id = city.id
    row.location = location_str
    row.seller = body.seller
    row.seller_name = body.sellerName
    row.description = (body.description or "").strip()
    row.features = body.features
    row.images = body.images
    row.video_url = body.video_url
    db.commit()
    db.refresh(row)
    return truck_to_out(row, db)
