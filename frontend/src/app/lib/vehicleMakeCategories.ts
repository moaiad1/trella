/**
 * Which sell-flow categories (see sellListingCategories.ts) each make is
 * relevant to. Keeps the make dropdown scoped to the category the seller
 * picked in step 1 — e.g. no construction-equipment brands like Bobcat
 * under "Tractor unit". A make can belong to more than one category (DAF
 * sells both tractor units and rigid trucks).
 *
 * Makes not listed here simply don't show under a specific category (the
 * combobox still lets sellers type a custom make), but always show under
 * "various" since that category is intentionally unfiltered.
 */
export const MAKE_SELL_CATEGORIES: Record<string, string[]> = {
  // Highway tractor units (also sell heavy rigid trucks)
  Freightliner: ["tractorUnit", "rigidTruck"],
  Kenworth: ["tractorUnit", "rigidTruck"],
  Peterbilt: ["tractorUnit", "rigidTruck"],
  Mack: ["tractorUnit", "rigidTruck"],
  Volvo: ["tractorUnit", "rigidTruck"],
  International: ["tractorUnit", "rigidTruck"],
  Lonestar: ["tractorUnit", "rigidTruck"],
  "Western Star": ["tractorUnit", "rigidTruck"],
  Sterling: ["tractorUnit", "rigidTruck"],
  Autocar: ["tractorUnit", "rigidTruck"],
  "Mercedes-Benz": ["tractorUnit", "rigidTruck", "van"],
  MAN: ["tractorUnit", "rigidTruck"],
  Scania: ["tractorUnit", "rigidTruck"],
  DAF: ["tractorUnit", "rigidTruck"],
  Iveco: ["tractorUnit", "rigidTruck"],
  "Renault Trucks": ["tractorUnit", "rigidTruck"],
  Tatra: ["tractorUnit", "rigidTruck"],
  Sinotruk: ["tractorUnit", "rigidTruck"],
  Shacman: ["tractorUnit", "rigidTruck"],
  FAW: ["tractorUnit", "rigidTruck"],
  Dongfeng: ["tractorUnit", "rigidTruck"],
  Beiben: ["tractorUnit", "rigidTruck"],
  "UD Trucks": ["tractorUnit", "rigidTruck"],
  Hyundai: ["tractorUnit", "rigidTruck"],
  Hino: ["tractorUnit", "rigidTruck"],
  BMC: ["tractorUnit", "rigidTruck"],

  // Medium/light-duty rigid & box trucks
  Isuzu: ["rigidTruck"],
  Fuso: ["rigidTruck"],
  "Mitsubishi Fuso": ["rigidTruck"],
  "Crane Carrier": ["rigidTruck"],

  // Pickup/van OEMs that also sell chassis-cab or box trucks
  Ford: ["rigidTruck", "van"],
  Chevrolet: ["rigidTruck", "van"],
  GMC: ["rigidTruck", "van"],
  Ram: ["rigidTruck", "van"],
  Dodge: ["van"],
  Nissan: ["van"],

  // Semi-trailers (unpowered)
  Wabash: ["semiTrailers"],
  "Great Dane": ["semiTrailers"],
  Fontaine: ["semiTrailers"],
  Manac: ["semiTrailers"],
  Monon: ["semiTrailers"],
  "Polar Tank": ["semiTrailers"],
  Stoughton: ["semiTrailers"],
  "Trail King": ["semiTrailers"],
  Utility: ["semiTrailers"],
  Vanguard: ["semiTrailers"],
  Wilson: ["semiTrailers"],

  // Agriculture equipment
  "Case IH": ["agriculture"],
  "John Deere": ["agriculture"],
  "New Holland": ["agriculture"],
  Kubota: ["agriculture"],

  // Construction / heavy equipment & yard machines
  Caterpillar: ["machine"],
  Komatsu: ["machine"],
  JCB: ["machine"],
  Bobcat: ["machine"],
  Case: ["machine"],
  Gehl: ["machine"],
  ASV: ["machine"],
  Hyster: ["machine"],
  Yale: ["machine"],
  Kalmar: ["machine"],
  "Kalmar Ottawa": ["machine"],
  Ottawa: ["machine"],
  Capacity: ["machine"],
  "Capacity TJ": ["machine"],
};

/**
 * Narrow `allMakes` down to the ones tagged for `categoryId`. Falls back to
 * the full list for the "various" catch-all, for unknown/null category ids,
 * and if filtering would otherwise leave nothing to pick from.
 */
export function filterMakesForCategory(
  allMakes: string[],
  categoryId: string | null | undefined,
): string[] {
  if (!categoryId || categoryId === "various") return allMakes;
  const filtered = allMakes.filter((make) =>
    (MAKE_SELL_CATEGORIES[make] ?? []).includes(categoryId),
  );
  return filtered.length > 0 ? filtered : allMakes;
}
