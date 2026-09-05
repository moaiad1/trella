"""Classify listing photos into Trella sell-flow category ids using OpenAI vision."""

from __future__ import annotations

import base64
import json
import logging
import re
from typing import Any

import httpx

from app.config import settings

log = logging.getLogger("trella")

ALLOWED_SELL_CATEGORY_IDS = frozenset(
    {
        "tractorUnit",
        "rigidTruck",
        "semiTrailers",
        "van",
        "agriculture",
        "machine",
        "various",
    },
)

SYSTEM_PROMPT = """You classify commercial vehicle listing photos for a marketplace.
Pick exactly ONE sellCategoryId from this list (use these exact ids):

- tractorUnit — Prime mover / tractor head / semi-truck cab only (fifth wheel visible, no fixed cargo box on the same chassis). DAF/Volvo/MAN cab units fall here.
- rigidTruck — Rigid truck, box truck, flatbed truck with cargo body on same chassis (not a standalone trailer).
- semiTrailers — A semi-trailer (the trailer unit behind a tractor), or clearly a coupled semi-trailer in the shot; or a standalone trailer (flatbed, lowbed, tank) without a tractor cab as the main subject.
- van — Delivery van, panel van, LCV.
- agriculture — Farm tractor or agricultural machine (not road tractor unit).
- machine — Construction: dump truck, excavator, forklift, wheel loader, concrete mixer truck, heavy yellow plant.
- various — Unclear, interior-only, damaged photo, non-vehicle, or does not fit above.

Respond with JSON only, no markdown:
{"sellCategoryId":"<id>","confidence":<0.0-1.0>,"briefReason":"<short English phrase>"}
"""


def _strip_json_fence(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\s*```\s*$", "", t)
    return t.strip()


def _parse_model_json(text: str) -> dict[str, Any]:
    raw = _strip_json_fence(text)
    return json.loads(raw)


async def classify_listing_image_bytes(image_bytes: bytes, content_type: str) -> dict[str, Any]:
    """Call OpenAI vision; returns dict with sellCategoryId, confidence, briefReason."""
    key = (settings.openai_api_key or "").strip()
    if not key:
        raise RuntimeError("OPENAI_API_KEY not configured")

    if len(image_bytes) > settings.max_upload_bytes:
        raise ValueError("Image too large")

    mime = content_type.split(";")[0].strip().lower() if content_type else "image/jpeg"
    if not mime.startswith("image/"):
        mime = "image/jpeg"

    b64 = base64.standard_b64encode(image_bytes).decode("ascii")
    data_url = f"data:{mime};base64,{b64}"

    payload = {
        "model": settings.openai_vision_model,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "What sellCategoryId best matches this vehicle listing photo?",
                    },
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
    }

    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)

    if r.status_code != 200:
        log.warning("OpenAI error %s: %s", r.status_code, r.text[:500])
        raise RuntimeError(f"OpenAI request failed ({r.status_code})")

    data = r.json()
    try:
        text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        log.exception("Unexpected OpenAI response shape: %s", data)
        raise RuntimeError("Invalid OpenAI response") from e

    try:
        parsed = _parse_model_json(text)
    except json.JSONDecodeError as e:
        log.warning("Model JSON parse failed: %s", text[:300])
        raise RuntimeError("Could not parse model output") from e

    cid = str(parsed.get("sellCategoryId", "")).strip()
    if cid not in ALLOWED_SELL_CATEGORY_IDS:
        log.warning("Model returned invalid sellCategoryId: %s", cid)
        cid = "various"

    conf_raw = parsed.get("confidence", 0.5)
    try:
        confidence = float(conf_raw)
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))

    reason = str(parsed.get("briefReason", "") or "").strip()[:500]

    return {
        "sellCategoryId": cid,
        "confidence": confidence,
        "briefReason": reason,
    }
