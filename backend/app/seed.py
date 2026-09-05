import logging
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import SaudiCity, SaudiRegion, Truck, User
from app.security import hash_password

log = logging.getLogger("trella")

DEMO_SELLER_EMAIL = "seller@marketsmart.demo"


def _d(s: str) -> date:
    return date.fromisoformat(s)


def seed_if_empty(db: Session) -> None:
    """If TRELLA_SEED_DEMO is true and trucks table has no rows, insert demo user + trucks."""
    if not settings.seed_demo:
        log.info("TRELLA_SEED_DEMO is off — skipping demo trucks (tables may stay empty).")
        return

    n = db.scalar(select(func.count()).select_from(Truck))
    if n and n > 0:
        log.info("Trucks table already has %s row(s); demo seed skipped.", n)
        return

    seller = db.scalar(select(User).where(User.email == DEMO_SELLER_EMAIL))
    if not seller:
        seller = User(
            email=DEMO_SELLER_EMAIL,
            password_hash=hash_password("demo12345"),
        )
        db.add(seller)
        db.flush()
    seller_id = seller.id

    riyadh = db.scalar(select(SaudiCity).where(SaudiCity.name_en == "Riyadh").limit(1))
    default_city_id = riyadh.id if riyadh else None
    default_loc = "Riyadh, Riyadh Region"
    if riyadh:
        reg = db.get(SaudiRegion, riyadh.region_id)
        if reg:
            default_loc = f"{riyadh.name_en}, {reg.name_en}"

    rows = [
        Truck(
            user_id=seller_id,
            seller_phone="555-0101",
            make="Volvo",
            model="VNL 860",
            year=2021,
            price=89500,
            mileage=125000,
            truck_type="semi",
            condition="excellent",
            transmission="automatic",
            fuel_type="diesel",
            city_id=default_city_id,
            location=default_loc,
            seller="company",
            seller_name="Premier Truck Sales",
            description=(
                "Well-maintained Volvo VNL 860 with sleeper cab. Excellent condition with full "
                "service history. Perfect for long haul operations."
            ),
            features=["Sleeper Cab", "Air Conditioning", "Cruise Control", "Air Suspension", "Bluetooth"],
            images=[
                "https://images.unsplash.com/photo-1720811559337-c59b75acc4de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZW1pJTIwdHJ1Y2slMjB0cmFuc3BvcnRhdGlvbnxlbnwxfHx8fDE3NzQzNjE1ODd8MA&ixlib=rb-4.1.0&q=80&w=1080"
            ],
            date_added=_d("2026-03-20"),
        ),
        Truck(
            user_id=seller_id,
            seller_phone="555-0102",
            make="Ford",
            model="F-150",
            year=2019,
            price=32000,
            mileage=45000,
            truck_type="pickup",
            condition="good",
            transmission="automatic",
            fuel_type="gasoline",
            city_id=default_city_id,
            location=default_loc,
            seller="individual",
            seller_name="John Mitchell",
            description=(
                "Reliable Ford F-150 in great condition. Single owner, well maintained. "
                "Perfect work truck with plenty of power."
            ),
            features=["4WD", "Towing Package", "Backup Camera", "Bluetooth", "Tonneau Cover"],
            images=[
                "https://images.unsplash.com/photo-1605766842985-ab39682e9dcf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1c2VkJTIwcGlja3VwJTIwdHJ1Y2t8ZW58MXx8fHwxNzc0MzYxNTg3fDA&ixlib=rb-4.1.0&q=80&w=1080"
            ],
            date_added=_d("2026-03-18"),
        ),
        Truck(
            user_id=seller_id,
            seller_phone="555-0103",
            make="Mercedes-Benz",
            model="Sprinter 2500",
            year=2020,
            price=45000,
            mileage=68000,
            truck_type="van",
            condition="excellent",
            transmission="automatic",
            fuel_type="diesel",
            city_id=default_city_id,
            location=default_loc,
            seller="company",
            seller_name="Commercial Vehicles Inc",
            description=(
                "Mercedes Sprinter 2500 cargo van. High roof, extended length. Perfect for "
                "delivery or conversion. Well maintained fleet vehicle."
            ),
            features=["High Roof", "Extended Length", "Rear Camera", "Air Conditioning", "Power Windows"],
            images=[
                "https://images.unsplash.com/photo-1761454200783-ca533f7928e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWxpdmVyeSUyMHZhbiUyMGNvbW1lcmNpYWx8ZW58MXx8fHwxNzc0MzI3MDIyfDA&ixlib=rb-4.1.0&q=80&w=1080"
            ],
            date_added=_d("2026-03-22"),
        ),
        Truck(
            user_id=seller_id,
            seller_phone="555-0104",
            make="Peterbilt",
            model="579",
            year=2022,
            price=115000,
            mileage=85000,
            truck_type="semi",
            condition="excellent",
            transmission="automatic",
            fuel_type="diesel",
            city_id=default_city_id,
            location=default_loc,
            seller="company",
            seller_name="Midwest Trucks",
            description=(
                "Nearly new Peterbilt 579 with advanced safety features. Low mileage, excellent "
                "fuel economy. Perfect for owner-operators."
            ),
            features=[
                "Adaptive Cruise",
                "Lane Departure Warning",
                "Collision Mitigation",
                "Premium Sound",
                "Heated Seats",
            ],
            images=[
                "https://images.unsplash.com/photo-1758218921066-a9d911269bb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tZXJjaWFsJTIwdHJ1Y2slMjBoaWdod2F5fGVufDF8fHx8MTc3NDI5OTIyMHww&ixlib=rb-4.1.0&q=80&w=1080"
            ],
            date_added=_d("2026-03-15"),
        ),
        Truck(
            user_id=seller_id,
            seller_phone="555-0105",
            make="Mack",
            model="Granite",
            year=2018,
            price=72000,
            mileage=156000,
            truck_type="dump",
            condition="good",
            transmission="automatic",
            fuel_type="diesel",
            city_id=default_city_id,
            location=default_loc,
            seller="company",
            seller_name="Rocky Mountain Equipment",
            description=(
                "Heavy-duty Mack Granite dump truck. Strong engine, reliable performance. "
                "Great for construction and hauling operations."
            ),
            features=["Hydraulic Dump Bed", "Engine Brake", "Air Ride Suspension", "Dual Fuel Tanks"],
            images=[
                "https://images.unsplash.com/photo-1723369962510-e1bf627435e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkdW1wJTIwdHJ1Y2slMjBjb25zdHJ1Y3Rpb258ZW58MXx8fHwxNzc0MzYxNTg4fDA&ixlib=rb-4.1.0&q=80&w=1080"
            ],
            date_added=_d("2026-03-19"),
        ),
        Truck(
            user_id=seller_id,
            seller_phone="555-0106",
            make="Freightliner",
            model="M2 106",
            year=2020,
            price=68500,
            mileage=92000,
            truck_type="flatbed",
            condition="good",
            transmission="automatic",
            fuel_type="diesel",
            city_id=default_city_id,
            location=default_loc,
            seller="company",
            seller_name="Texas Truck Center",
            description=(
                "Freightliner M2 106 with 24ft flatbed. Versatile and reliable. Perfect for "
                "hauling equipment and materials."
            ),
            features=["24ft Flatbed", "Winch", "Ramps", "Air Brakes", "Tilt Cab"],
            images=[
                "https://images.unsplash.com/photo-1767696674746-14d4d6a3ec48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmbGF0YmVkJTIwdHJ1Y2slMjBjYXJnb3xlbnwxfHx8fDE3NzQzNjE1ODh8MA&ixlib=rb-4.1.0&q=80&w=1080"
            ],
            date_added=_d("2026-03-21"),
        ),
    ]
    db.add_all(rows)
    db.commit()
    log.info(
        "Demo data loaded: user %s + %d trucks (password: demo12345).",
        DEMO_SELLER_EMAIL,
        len(rows),
    )
