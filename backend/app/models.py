from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class VehicleMake(Base):
    """Reference manufacturer (e.g. Mercedes-Benz, Volvo)."""

    __tablename__ = "vehicle_makes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)

    models: Mapped[list["VehicleModel"]] = relationship(
        back_populates="make",
        cascade="all, delete-orphan",
    )


class VehicleModel(Base):
    """Reference model line linked to a manufacturer (e.g. Actros under Mercedes-Benz)."""

    __tablename__ = "vehicle_models"
    __table_args__ = (UniqueConstraint("make_id", "name", name="uq_vehicle_model_make_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    make_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("vehicle_makes.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(128))

    make: Mapped["VehicleMake"] = relationship(back_populates="models")


class SaudiRegion(Base):
    """Saudi administrative region (state) for listing location."""

    __tablename__ = "saudi_regions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    name_en: Mapped[str] = mapped_column(String(128))
    name_ar: Mapped[str] = mapped_column(String(128))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    cities: Mapped[list["SaudiCity"]] = relationship(
        back_populates="region",
        cascade="all, delete-orphan",
    )


class SaudiCity(Base):
    """City within a Saudi region."""

    __tablename__ = "saudi_cities"
    __table_args__ = (UniqueConstraint("region_id", "name_en", name="uq_saudi_city_region_name_en"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    region_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("saudi_regions.id", ondelete="CASCADE"),
        index=True,
    )
    name_en: Mapped[str] = mapped_column(String(128))
    name_ar: Mapped[str] = mapped_column(String(128))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    region: Mapped["SaudiRegion"] = relationship(back_populates="cities")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    first_name: Mapped[str] = mapped_column(String(128), default="")
    last_name: Mapped[str] = mapped_column(String(128), default="")
    phone: Mapped[str] = mapped_column(String(32), default="")
    # individual | company
    account_type: Mapped[str] = mapped_column(String(16), default="individual")
    company_name: Mapped[str] = mapped_column(String(256), default="")
    # Saudi commercial registration number (10 digits)
    cr_number: Mapped[str] = mapped_column(String(16), default="")
    has_vat: Mapped[bool] = mapped_column(Boolean, default=False)
    # Saudi VAT/TRN number (15 digits, starts and ends with 3)
    vat_number: Mapped[str] = mapped_column(String(16), default="")
    # Company profile — logo, extra contact numbers, responsible representative
    logo_url: Mapped[str] = mapped_column(String(512), default="")
    extra_phones: Mapped[list | None] = mapped_column(JSON, nullable=True)
    rep_name: Mapped[str] = mapped_column(String(256), default="")
    rep_phone: Mapped[str] = mapped_column(String(32), default="")
    # Uploaded commercial registration certificate (company signup)
    cr_document_url: Mapped[str] = mapped_column(String(512), default="")
    terms_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    # Company account review state — pending | approved | rejected. Individual accounts stay "approved".
    company_status: Mapped[str] = mapped_column(String(16), default="approved")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PhoneChangeOtp(Base):
    """One pending SMS/email verification per user for phone number change."""

    __tablename__ = "phone_change_otps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    code_hash: Mapped[str] = mapped_column(String(255))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Truck(Base):
    __tablename__ = "trucks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    seller_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    make: Mapped[str] = mapped_column(String(128))
    model: Mapped[str] = mapped_column(String(128))
    year: Mapped[int] = mapped_column(Integer)
    price: Mapped[int] = mapped_column(Integer)
    mileage: Mapped[int] = mapped_column(Integer)
    truck_type: Mapped[str] = mapped_column("type", String(32))
    condition: Mapped[str] = mapped_column(String(32))
    transmission: Mapped[str] = mapped_column(String(32))
    fuel_type: Mapped[str] = mapped_column(String(32))
    city_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("saudi_cities.id"), nullable=True)
    location: Mapped[str] = mapped_column(String(256))
    seller: Mapped[str] = mapped_column(String(32))
    seller_name: Mapped[str] = mapped_column(String(256))
    description: Mapped[str] = mapped_column(Text())
    features: Mapped[list] = mapped_column(JSON)
    images: Mapped[list] = mapped_column(JSON)
    video_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # active | reserved | sold — sold listings are hidden from public inventory
    listing_status: Mapped[str] = mapped_column(String(16), default="active")
    date_added: Mapped[date] = mapped_column(Date)


class TruckInquiry(Base):
    __tablename__ = "truck_inquiries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    truck_id: Mapped[int] = mapped_column(Integer, ForeignKey("trucks.id"), index=True)
    buyer_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    body: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    seller_reply: Mapped[str | None] = mapped_column(Text(), nullable=True)
    replied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    messages: Mapped[list["TruckInquiryMessage"]] = relationship(
        back_populates="inquiry",
        cascade="all, delete-orphan",
    )


class TruckInquiryMessage(Base):
    __tablename__ = "truck_inquiry_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    inquiry_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("truck_inquiries.id", ondelete="CASCADE"),
        index=True,
    )
    sender_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    body: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    inquiry: Mapped["TruckInquiry"] = relationship(back_populates="messages")


class InquiryReadState(Base):
    """Per-user read cursor for an inquiry thread (for unread counts)."""

    __tablename__ = "inquiry_read_states"

    inquiry_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("truck_inquiries.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    last_read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
