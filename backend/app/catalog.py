"""Reference makes/models for trucks and equipment; merged with live DB in API."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path


@lru_cache
def _catalog_raw() -> dict[str, list[str]]:
    path = Path(__file__).resolve().parent / "data" / "truck_catalog.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return {str(k).strip(): [str(x).strip() for x in v if str(x).strip()] for k, v in data.items()}


def get_reference_catalog() -> dict[str, list[str]]:
    """Full reference catalog as loaded from JSON (make name -> model names)."""
    raw = _catalog_raw()
    return {k: list(v) for k, v in raw.items()}


def catalog_make_names() -> set[str]:
    return set(_catalog_raw().keys())


def catalog_models_for_make(make: str) -> set[str]:
    m = make.strip()
    raw = _catalog_raw()
    if m in raw:
        return set(raw[m])
    m_lower = m.lower()
    for key, models in raw.items():
        if key.lower() == m_lower:
            return set(models)
    return set()
