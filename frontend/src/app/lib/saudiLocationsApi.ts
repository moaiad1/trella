import { getApiBase } from "./apiBase";

const apiBase = getApiBase();

export interface SaudiRegion {
  id: number;
  nameEn: string;
  nameAr: string;
}

export interface SaudiCity {
  id: number;
  nameEn: string;
  nameAr: string;
}

export async function fetchSaudiRegions(): Promise<SaudiRegion[]> {
  const r = await fetch(`${apiBase}/trucks/locations/regions`);
  if (!r.ok) return [];
  const data = (await r.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data.filter(
    (x): x is SaudiRegion =>
      x != null &&
      typeof x === "object" &&
      typeof (x as SaudiRegion).id === "number" &&
      typeof (x as SaudiRegion).nameEn === "string",
  );
}

export async function fetchCityWithRegion(
  cityId: number,
): Promise<{ id: number; nameEn: string; nameAr: string; regionId: number } | null> {
  const r = await fetch(`${apiBase}/trucks/locations/city/${encodeURIComponent(String(cityId))}`);
  if (!r.ok) return null;
  return (await r.json()) as {
    id: number;
    nameEn: string;
    nameAr: string;
    regionId: number;
  };
}

export async function fetchSaudiCities(regionId: number): Promise<SaudiCity[]> {
  if (!regionId) return [];
  const r = await fetch(
    `${apiBase}/trucks/locations/cities?regionId=${encodeURIComponent(String(regionId))}`,
  );
  if (!r.ok) return [];
  const data = (await r.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data.filter(
    (x): x is SaudiCity =>
      x != null &&
      typeof x === "object" &&
      typeof (x as SaudiCity).id === "number" &&
      typeof (x as SaudiCity).nameEn === "string",
  );
}
