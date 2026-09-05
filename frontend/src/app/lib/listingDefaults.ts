import type { Truck } from "../context/TruckContext";

/** Fallback when a listing has no photos (matches add-listing default). */
export const DEFAULT_LISTING_IMAGE =
  "https://images.unsplash.com/photo-1605766842985-ab39682e9dcf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1c2VkJTIwcGlja3VwJTIwdHJ1Y2t8ZW58MXx8fHwxNzc0MzYxNTg3fDA&ixlib=rb-4.1.0&q=80&w=1080";

/** Public listing reference (SA-0000001); falls back if API omits refNo. */
export function listingRefDisplay(truck: Pick<Truck, "id" | "refNo">): string {
  const r = truck.refNo?.trim();
  if (r) return r;
  return `SA-${String(truck.id).replace(/\D/g, "").padStart(7, "0")}`;
}
