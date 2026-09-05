from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.deps import get_current_user_required
from app.listing_category_vision import classify_listing_image_bytes
from app.models import User
from app.config import settings

router = APIRouter(tags=["ai"])


@router.post("/me/classify-listing-image")
async def classify_listing_image(
    file: UploadFile = File(...),
    _user: User = Depends(get_current_user_required),
) -> dict:
    """Suggest sell-flow category from one listing photo (OpenAI vision). Requires OPENAI_API_KEY."""
    if not (settings.openai_api_key or "").strip():
        raise HTTPException(
            status_code=503,
            detail="AI category detection is not configured (set OPENAI_API_KEY).",
        )

    content_type = file.content_type or "image/jpeg"
    try:
        raw = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Could not read file") from e

    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        result = await classify_listing_image_bytes(raw, content_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    return result
