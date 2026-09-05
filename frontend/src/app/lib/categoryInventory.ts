import type { Truck } from "../context/TruckContext";

/** Category id → truck `type` values to filter (OR). */
export const CATEGORY_TYPES: Record<string, string[]> = {
  tractorhead: ["semi"],
  truck: ["commercial"],
  lightCommercial: ["van"],
  construction: ["dump"],
  semiTrailer: ["semi"],
};

/** Per-pill counts (matches reference layout; some types appear in multiple pills). */
export function computeCategoryCounts(trucks: Pick<Truck, "type">[]): Record<string, number> {
  const byType = trucks.reduce(
    (acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const semi = byType.semi ?? 0;
  const commercial = byType.commercial ?? 0;
  const van = byType.van ?? 0;
  const dump = byType.dump ?? 0;
  return {
    tractorhead: semi,
    truck: commercial,
    lightCommercial: van,
    construction: dump,
    semiTrailer: semi,
  };
}
