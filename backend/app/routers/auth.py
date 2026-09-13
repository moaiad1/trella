import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user_required
from app.email_sender import send_email
from app.models import LoginChallenge, PhoneChangeOtp, SignupChallenge, User
from app.schemas import (
    CompanyProfileUpdate,
    PasswordChange,
    PhoneChangeConfirmBody,
    PhoneChangeRequestBody,
    PhoneSetInitialBody,
    RegisterChallenge,
    ResendSignupCodeBody,
    Token,
    TwoFactorChallenge,
    UserLogin,
    UserPublic,
    UserRegister,
    VerifyTwoFactorBody,
)
from app.security import create_access_token, hash_password, normalize_phone, verify_password

router = APIRouter()
log = logging.getLogger(__name__)


def _as_utc(dt: datetime) -> datetime:
    """SQLite drops tzinfo on round-trip; values we write here are always UTC, so reattach it."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _user_public(u: User) -> UserPublic:
    return UserPublic(
        id=u.id,
        email=u.email,
        firstName=(u.first_name or "").strip(),
        lastName=(u.last_name or "").strip(),
        phone=(u.phone or "").strip(),
        accountType=(u.account_type or "individual"),  # type: ignore[arg-type]
        companyName=(u.company_name or "").strip(),
        crNumber=(u.cr_number or "").strip(),
        hasVat=bool(u.has_vat),
        vatNumber=(u.vat_number or "").strip(),
        logoUrl=(u.logo_url or "").strip(),
        extraPhones=list(u.extra_phones or []),
        repName=(u.rep_name or "").strip(),
        repPhone=(u.rep_phone or "").strip(),
        crDocumentUrl=(u.cr_document_url or "").strip(),
        termsAccepted=bool(u.terms_accepted),
        isAdmin=bool(u.is_admin),
        companyStatus=(u.company_status or "approved"),  # type: ignore[arg-type]
    )


SIGNUP_OTP_TTL_MINUTES = 10


def _send_signup_code(db: Session, row: SignupChallenge, code: str) -> None:
    sent = send_email(
        row.email,
        "Verify your Trucks account",
        f"Your verification code is: {code}\n\nThis code expires in {SIGNUP_OTP_TTL_MINUTES} minutes.",
    )
    if not sent:
        log.warning("Signup verification email not sent (Resend not configured or send failed)")


def _issue_signup_challenge(db: Session, row: SignupChallenge, code: str) -> RegisterChallenge:
    db.commit()
    _send_signup_code(db, row, code)
    return RegisterChallenge(
        challengeToken=row.challenge_token,
        debugCode=code if settings.admin_2fa_debug else None,
        cooldownSeconds=settings.signup_otp_cooldown_seconds,
    )


@router.post("/register", response_model=RegisterChallenge)
def register(body: UserRegister, db: Session = Depends(get_db)) -> RegisterChallenge:
    email = str(body.email).strip().lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=400, detail="Email already registered")
    is_company = body.accountType == "company"

    existing = db.scalar(select(SignupChallenge).where(SignupChallenge.email == email))
    if existing:
        db.delete(existing)
        db.flush()

    payload = {
        "password_hash": hash_password(body.password),
        "first_name": str(body.firstName).strip(),
        "last_name": str(body.lastName).strip(),
        "phone": str(body.phone).strip(),
        "account_type": body.accountType,
        "company_name": body.companyName.strip() if is_company else "",
        "cr_number": body.crNumber.strip() if is_company else "",
        "has_vat": body.hasVat if is_company else False,
        "vat_number": body.vatNumber.strip() if (is_company and body.hasVat) else "",
        "terms_accepted": body.termsAccepted,
        "company_status": "pending" if is_company else "approved",
    }

    now = datetime.now(timezone.utc)
    code = f"{secrets.randbelow(900000) + 100000:06d}"
    row = SignupChallenge(
        email=email,
        challenge_token=secrets.token_urlsafe(32),
        payload=payload,
        code_hash=hash_password(code),
        expires_at=now + timedelta(minutes=SIGNUP_OTP_TTL_MINUTES),
        last_sent_at=now,
    )
    db.add(row)
    return _issue_signup_challenge(db, row, code)


@router.post("/register/verify", response_model=Token)
def register_verify(body: VerifyTwoFactorBody, db: Session = Depends(get_db)) -> Token:
    row = db.scalar(select(SignupChallenge).where(SignupChallenge.challenge_token == body.challengeToken))
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired code — sign up again")
    if _as_utc(row.expires_at) < datetime.now(timezone.utc):
        db.delete(row)
        db.commit()
        raise HTTPException(status_code=400, detail="Code expired — sign up again")
    if not verify_password(body.code, row.code_hash):
        raise HTTPException(status_code=400, detail="Incorrect code")

    if db.scalar(select(User).where(User.email == row.email)):
        db.delete(row)
        db.commit()
        raise HTTPException(status_code=400, detail="Email already registered")

    p = row.payload
    user = User(
        email=row.email,
        password_hash=p["password_hash"],
        first_name=p["first_name"],
        last_name=p["last_name"],
        phone=p["phone"],
        account_type=p["account_type"],
        company_name=p["company_name"],
        cr_number=p["cr_number"],
        has_vat=p["has_vat"],
        vat_number=p["vat_number"],
        terms_accepted=p["terms_accepted"],
        company_status=p["company_status"],
    )
    db.add(user)
    db.delete(row)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_access_token(user.id))


@router.post("/register/resend", response_model=RegisterChallenge)
def register_resend(body: ResendSignupCodeBody, db: Session = Depends(get_db)) -> RegisterChallenge:
    row = db.scalar(select(SignupChallenge).where(SignupChallenge.challenge_token == body.challengeToken))
    if not row:
        raise HTTPException(status_code=400, detail="Verification session not found — sign up again")

    now = datetime.now(timezone.utc)
    elapsed = (now - _as_utc(row.last_sent_at)).total_seconds()
    if elapsed < settings.signup_otp_cooldown_seconds:
        remaining = int(settings.signup_otp_cooldown_seconds - elapsed)
        raise HTTPException(status_code=429, detail=f"Please wait {remaining}s before requesting a new code")

    code = f"{secrets.randbelow(900000) + 100000:06d}"
    row.code_hash = hash_password(code)
    row.expires_at = now + timedelta(minutes=SIGNUP_OTP_TTL_MINUTES)
    row.last_sent_at = now
    db.add(row)
    return _issue_signup_challenge(db, row, code)


@router.post("/login", response_model=TwoFactorChallenge)
def login(body: UserLogin, db: Session = Depends(get_db)) -> TwoFactorChallenge:
    email = str(body.email).strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    existing = db.scalar(select(LoginChallenge).where(LoginChallenge.user_id == user.id))
    if existing:
        db.delete(existing)
        db.flush()

    challenge_token = secrets.token_urlsafe(32)
    code = f"{secrets.randbelow(900000) + 100000:06d}"
    db.add(
        LoginChallenge(
            user_id=user.id,
            challenge_token=challenge_token,
            code_hash=hash_password(code),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
    )
    db.commit()

    log.warning("Login 2FA code for user_id=%s: %s", user.id, code)
    sent = send_email(
        user.email,
        "Your Trucks login code",
        f"Your verification code is: {code}\n\nThis code expires in 10 minutes.",
    )
    if not sent:
        log.warning("Login 2FA email not sent (Resend not configured or send failed)")

    return TwoFactorChallenge(
        challengeToken=challenge_token,
        debugCode=code if settings.admin_2fa_debug else None,
    )


@router.post("/login/verify-2fa", response_model=Token)
def verify_two_factor(body: VerifyTwoFactorBody, db: Session = Depends(get_db)) -> Token:
    row = db.scalar(
        select(LoginChallenge).where(LoginChallenge.challenge_token == body.challengeToken)
    )
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired code — log in again")
    if _as_utc(row.expires_at) < datetime.now(timezone.utc):
        db.delete(row)
        db.commit()
        raise HTTPException(status_code=400, detail="Code expired — log in again")
    if not verify_password(body.code, row.code_hash):
        raise HTTPException(status_code=400, detail="Incorrect code")

    user_id = row.user_id
    db.delete(row)
    db.commit()
    return Token(access_token=create_access_token(user_id))


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(get_current_user_required)) -> UserPublic:
    return _user_public(user)


@router.patch("/company-profile", response_model=UserPublic)
def update_company_profile(
    body: CompanyProfileUpdate,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
) -> UserPublic:
    if user.account_type != "company":
        raise HTTPException(status_code=400, detail="Only company accounts have a company profile")
    user.logo_url = body.logoUrl.strip()
    user.cr_document_url = body.crDocumentUrl.strip()
    user.extra_phones = body.extraPhones
    user.rep_name = body.repName.strip()
    user.rep_phone = body.repPhone.strip()
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_public(user)


@router.post("/password-change")
def password_change(
    body: PasswordChange,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    if not verify_password(body.currentPassword, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if body.currentPassword == body.newPassword:
        raise HTTPException(status_code=400, detail="New password must be different from the current one")
    user.password_hash = hash_password(body.newPassword)
    db.add(user)
    db.commit()
    return {"ok": True}


@router.post("/phone/set", response_model=UserPublic)
def phone_set_initial(
    body: PhoneSetInitialBody,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
) -> UserPublic:
    if normalize_phone(user.phone or ""):
        raise HTTPException(status_code=400, detail="Phone already set — use the change-phone flow")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid password")
    user.phone = normalize_phone(body.newPhone)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_public(user)


@router.post("/phone-change/request")
def phone_change_request(
    body: PhoneChangeRequestBody,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
) -> dict[str, bool | str | None]:
    stored = normalize_phone(user.phone or "")
    if not stored:
        raise HTTPException(
            status_code=400,
            detail="No phone on file — add your number using password verification first",
        )
    if normalize_phone(body.oldPhone) != stored:
        raise HTTPException(status_code=400, detail="That number does not match your account")

    existing = db.scalar(select(PhoneChangeOtp).where(PhoneChangeOtp.user_id == user.id))
    if existing:
        db.delete(existing)
        db.flush()

    code = f"{secrets.randbelow(900000) + 100000:06d}"
    row = PhoneChangeOtp(
        user_id=user.id,
        code_hash=hash_password(code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(row)
    db.commit()

    # Production: send SMS to user.phone via your provider.
    log.info("Phone change verification created for user_id=%s", user.id)
    out: dict[str, bool | str | None] = {"sent": True}
    if settings.phone_otp_debug:
        log.warning("TRELLA_PHONE_OTP_DEBUG active — OTP for user_id=%s is %s", user.id, code)
        out["debugCode"] = code
    return out


@router.post("/phone-change/confirm", response_model=UserPublic)
def phone_change_confirm(
    body: PhoneChangeConfirmBody,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
) -> UserPublic:
    if normalize_phone(body.oldPhone) != normalize_phone(user.phone or ""):
        raise HTTPException(status_code=400, detail="Phone does not match your account")

    row = db.scalar(select(PhoneChangeOtp).where(PhoneChangeOtp.user_id == user.id))
    if not row:
        raise HTTPException(status_code=400, detail="No verification pending — request a code first")
    if _as_utc(row.expires_at) < datetime.now(timezone.utc):
        db.delete(row)
        db.commit()
        raise HTTPException(status_code=400, detail="Verification code expired — request a new one")

    code = str(body.code).strip().replace(" ", "")
    if not verify_password(code, row.code_hash):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    new_digits = normalize_phone(body.newPhone)
    if len(new_digits) < 8:
        raise HTTPException(status_code=400, detail="Invalid new phone number")

    user.phone = new_digits
    db.delete(row)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_public(user)
