import logging

import httpx
from sqlalchemy.orm import Session

from app.models import IpGeoCache

log = logging.getLogger(__name__)

_PRIVATE_PREFIXES = ("127.", "10.", "192.168.", "::1", "0.")


def _is_private(ip: str) -> bool:
    if ip.startswith(_PRIVATE_PREFIXES):
        return True
    if ip.startswith("172."):
        try:
            second = int(ip.split(".")[1])
            return 16 <= second <= 31
        except (IndexError, ValueError):
            return False
    return False


def resolve_country(db: Session, ip: str) -> str | None:
    """Look up an IP's country, using a DB-backed cache to avoid repeat API calls."""
    ip = (ip or "").strip()
    if not ip or _is_private(ip):
        return None

    cached = db.get(IpGeoCache, ip)
    if cached:
        return cached.country

    country: str | None = None
    try:
        res = httpx.get(
            f"http://ip-api.com/json/{ip}",
            params={"fields": "status,country"},
            timeout=4.0,
        )
        if res.status_code == 200:
            data = res.json()
            if data.get("status") == "success":
                country = data.get("country")
    except httpx.HTTPError:
        log.warning("IP geolocation lookup failed for %s", ip)

    db.add(IpGeoCache(ip_address=ip, country=country))
    db.commit()
    return country
