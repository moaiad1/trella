import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from sqlalchemy.orm import Session

from app.models import SaudiCity, SaudiRegion, Truck


def listing_ref_no(truck_id: int) -> str:
    """Human-readable listing reference (e.g. SA-0000042)."""
    return f"SA-{truck_id:07d}"


class SaudiLocationRegion(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    nameEn: str
    nameAr: str


class SaudiLocationCity(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    nameEn: str
    nameAr: str


class SaudiCityWithRegion(SaudiLocationCity):
    """City including parent region id (for listing edit forms)."""

    regionId: int


class TruckCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    make: str
    model: str
    year: int
    price: int
    mileage: int
    type: Literal["commercial", "pickup", "van", "dump", "flatbed", "semi"]
    condition: Literal["excellent", "good", "fair", "notWorking"]
    transmission: Literal["automatic", "manual"]
    fuelType: Literal["diesel", "gasoline", "electric", "hybrid"]
    city_id: int = Field(alias="cityId")
    seller: Literal["individual", "company"]
    sellerName: str
    sellerPhone: str = Field(min_length=8, max_length=32)
    description: str = ""
    features: list[str]
    images: list[str] = Field(default_factory=list, max_length=10)
    video_url: str | None = Field(default=None, alias="videoUrl", max_length=512)


# Same payload as create; used for PUT /trucks/{id}
TruckUpdate = TruckCreate


class ListingStatusUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    listing_status: Literal["active", "reserved", "sold"] = Field(alias="listingStatus")


class TruckOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    make: str
    model: str
    year: int
    price: int
    mileage: int
    type: Literal["commercial", "pickup", "van", "dump", "flatbed", "semi"]
    condition: Literal["excellent", "good", "fair", "notWorking"]
    transmission: Literal["automatic", "manual"]
    fuelType: Literal["diesel", "gasoline", "electric", "hybrid"]
    location: str
    cityId: int | None = Field(default=None, alias="cityId")
    seller: Literal["individual", "company"]
    sellerName: str
    sellerPhone: str
    ownerUserId: int | None
    description: str
    features: list[str]
    images: list[str]
    videoUrl: str | None = None
    listingStatus: Literal["active", "reserved", "sold"] = "active"
    dateAdded: str
    refNo: str


def _listing_status_out(t: Truck) -> Literal["active", "reserved", "sold"]:
    s = (getattr(t, "listing_status", None) or "active").strip().lower()
    if s in ("active", "reserved", "sold"):
        return s  # type: ignore[return-value]
    return "active"


def truck_to_out(t: Truck, db: Session) -> TruckOut:
    loc = (t.location or "").strip()
    cid = t.city_id
    if cid:
        city = db.get(SaudiCity, cid)
        if city:
            region = db.get(SaudiRegion, city.region_id)
            if region:
                loc = f"{city.name_en}, {region.name_en}"
    d = t.date_added.isoformat() if isinstance(t.date_added, date) else str(t.date_added)
    return TruckOut(
        id=str(t.id),
        make=t.make,
        model=t.model,
        year=t.year,
        price=t.price,
        mileage=t.mileage,
        type=t.truck_type,  # type: ignore[arg-type]
        condition=t.condition,  # type: ignore[arg-type]
        transmission=t.transmission,  # type: ignore[arg-type]
        fuelType=t.fuel_type,  # type: ignore[arg-type]
        location=loc,
        cityId=cid,
        seller=t.seller,  # type: ignore[arg-type]
        sellerName=t.seller_name,
        sellerPhone=(t.seller_phone or "").strip(),
        ownerUserId=t.user_id,
        description=t.description,
        features=list(t.features or []),
        images=list(t.images or []),
        videoUrl=(t.video_url or "").strip() or None,
        listingStatus=_listing_status_out(t),
        dateAdded=d,
        refNo=listing_ref_no(t.id),
    )


# Saudi commercial registration number: 10 digits.
CR_NUMBER_RE = re.compile(r"^\d{10}$")
# Saudi VAT/TRN number (ZATCA standard): 15 digits, starts and ends with 3.
VAT_NUMBER_RE = re.compile(r"^3\d{13}3$")


class UserRegister(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    firstName: str = Field(min_length=1, max_length=128)
    lastName: str = Field(min_length=1, max_length=128)
    phone: str = Field(min_length=8, max_length=32)
    accountType: Literal["individual", "company"] = "individual"
    companyName: str = Field(default="", max_length=256)
    crNumber: str = Field(default="", max_length=16)
    hasVat: bool = False
    vatNumber: str = Field(default="", max_length=16)
    termsAccepted: bool = False

    @model_validator(mode="after")
    def _validate_company_fields(self) -> "UserRegister":
        if not self.termsAccepted:
            raise ValueError("You must accept the Terms and Conditions to create an account")
        if self.accountType != "company":
            return self
        if not self.companyName.strip():
            raise ValueError("Company name is required for a company account")
        if not CR_NUMBER_RE.match(self.crNumber.strip()):
            raise ValueError("Commercial registration number must be exactly 10 digits")
        if self.hasVat and not VAT_NUMBER_RE.match(self.vatNumber.strip()):
            raise ValueError("VAT number must be 15 digits, starting and ending with 3")
        return self


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    email: str
    firstName: str = ""
    lastName: str = ""
    phone: str = ""
    accountType: Literal["individual", "company"] = "individual"
    companyName: str = ""
    crNumber: str = ""
    hasVat: bool = False
    vatNumber: str = ""
    logoUrl: str = ""
    extraPhones: list[str] = Field(default_factory=list)
    repName: str = ""
    repPhone: str = ""
    crDocumentUrl: str = ""
    termsAccepted: bool = False
    isAdmin: bool = False
    companyStatus: Literal["pending", "approved", "rejected"] = "approved"


class CompanyProfileUpdate(BaseModel):
    """Company-only profile fields editable from the account page after signup."""

    model_config = ConfigDict(populate_by_name=True)

    logoUrl: str = Field(default="", max_length=512)
    crDocumentUrl: str = Field(default="", max_length=512)
    extraPhones: list[str] = Field(default_factory=list)
    repName: str = Field(default="", max_length=256)
    repPhone: str = Field(default="", max_length=32)

    @model_validator(mode="after")
    def _validate_extra_phones(self) -> "CompanyProfileUpdate":
        cleaned = [p.strip() for p in self.extraPhones if p.strip()]
        if len(cleaned) > 10:
            raise ValueError("At most 10 additional phone numbers are allowed")
        for p in cleaned:
            if not (8 <= len(p) <= 32):
                raise ValueError("Each additional phone number must be 8–32 characters")
        self.extraPhones = cleaned
        if self.repPhone.strip() and not (8 <= len(self.repPhone.strip()) <= 32):
            raise ValueError("Representative phone must be 8–32 characters")
        return self


class PasswordChange(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    currentPassword: str = Field(min_length=1, max_length=128)
    newPassword: str = Field(min_length=8, max_length=128)


class PhoneChangeRequestBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    oldPhone: str = Field(min_length=8, max_length=32)


class PhoneChangeConfirmBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    oldPhone: str = Field(min_length=8, max_length=32)
    code: str = Field(min_length=4, max_length=8)
    newPhone: str = Field(min_length=8, max_length=32)


class PhoneSetInitialBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    password: str = Field(min_length=1, max_length=128)
    newPhone: str = Field(min_length=8, max_length=32)


class InquiryCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    body: str = Field(min_length=1, max_length=4000)


class ChatMessageCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    body: str = Field(min_length=1, max_length=4000)


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    senderUserId: int
    senderEmail: str
    body: str
    createdAt: str


class ChatThreadSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    inquiryId: int
    truckId: str
    truckLabel: str
    truckRefNo: str
    preview: str
    lastMessageAt: str
    unreadCount: int
    role: Literal["seller", "buyer"]
    buyerEmail: str | None = None


class ChatThreadsResponse(BaseModel):
    totalUnread: int
    threads: list[ChatThreadSummary]


class InquiryContextOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    truckId: str
    truckLabel: str
    truckRefNo: str
    role: Literal["seller", "buyer"]


class SellerInquiryOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    truckId: str
    truckLabel: str
    truckRefNo: str
    buyerEmail: str
    createdAt: str
    lastMessagePreview: str
    lastMessageAt: str
    unreadCount: int


class BuyerInquiryOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    truckId: str
    truckLabel: str
    truckRefNo: str
    createdAt: str
    lastMessagePreview: str
    lastMessageAt: str
    unreadCount: int


class AdminCompanyOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    email: str
    firstName: str
    lastName: str
    phone: str
    companyName: str
    crNumber: str
    hasVat: bool
    vatNumber: str
    crDocumentUrl: str
    logoUrl: str
    repName: str
    repPhone: str
    extraPhones: list[str]
    companyStatus: Literal["pending", "approved", "rejected"]
    createdAt: str


class AdminCompanyStatusUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    companyStatus: Literal["pending", "approved", "rejected"]
