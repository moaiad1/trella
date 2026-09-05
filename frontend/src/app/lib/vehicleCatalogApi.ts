import { getApiBase } from "./apiBase";

const apiBase = getApiBase();

function parseStringList(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data.filter((x): x is string => typeof x === "string");
}

/** Makes from `vehicle_makes` (relational catalog in DB). */
export async function fetchVehicleMakesFromDb(): Promise<string[]> {
  try {
    const r = await fetch(`${apiBase}/trucks/catalog/makes`);
    if (!r.ok) return [];
    return parseStringList(await r.json());
  } catch {
    return [];
  }
}

/** Models from `vehicle_models` for this make (relational catalog in DB). */
export async function fetchVehicleModelsFromDb(make: string): Promise<string[]> {
  const m = make.trim();
  if (!m) return [];
  try {
    const r = await fetch(`${apiBase}/trucks/catalog/models?make=${encodeURIComponent(m)}`);
    if (!r.ok) return [];
    return parseStringList(await r.json());
  } catch {
    return [];
  }
}

/** Merged makes: live listings + JSON + DB (legacy endpoint). */
export async function fetchMetaMakes(): Promise<string[]> {
  try {
    const r = await fetch(`${apiBase}/trucks/meta/makes`);
    if (!r.ok) return [];
    return parseStringList(await r.json());
  } catch {
    return [];
  }
}

export async function fetchMetaModelsForMake(make: string): Promise<string[]> {
  const m = make.trim();
  if (!m) return [];
  try {
    const r = await fetch(`${apiBase}/trucks/meta/models?make=${encodeURIComponent(m)}`);
    if (!r.ok) return [];
    return parseStringList(await r.json());
  } catch {
    return [];
  }
}
