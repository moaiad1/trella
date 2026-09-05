/** Client-side fallback when /api/trucks/meta/* is unavailable (offline, wrong URL, 500). */

let catalogCache: Record<string, string[]> | null = null;

export async function loadTruckCatalogFallback(): Promise<Record<string, string[]>> {
  if (catalogCache) return catalogCache;
  try {
    const res = await fetch("/truck_catalog.json", { cache: "force-cache" });
    if (!res.ok) return {};
    const data = (await res.json()) as Record<string, unknown>;
    catalogCache = {};
    for (const [k, v] of Object.entries(data)) {
      const key = String(k).trim();
      if (!key) continue;
      const models = Array.isArray(v)
        ? v.map((x) => String(x).trim()).filter(Boolean)
        : [];
      catalogCache[key] = models;
    }
    return catalogCache;
  } catch {
    return {};
  }
}

export async function fallbackMakes(): Promise<string[]> {
  const cat = await loadTruckCatalogFallback();
  return Object.keys(cat).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export async function fallbackModelsForMake(make: string): Promise<string[]> {
  const m = make.trim();
  if (!m) return [];
  const cat = await loadTruckCatalogFallback();
  if (cat[m]) return [...cat[m]].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const key = Object.keys(cat).find((k) => k.toLowerCase() === m.toLowerCase());
  return key ? [...cat[key]].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })) : [];
}
