import type { LucideIcon } from "lucide-react";
import {
  Caravan,
  Forklift,
  LayoutGrid,
  Link2,
  Tractor,
} from "lucide-react";
import semiTrailerIcon from "../../assets/category-semi-trailer.svg";
import tractorHeadIcon from "../../assets/category-tractor-head.png";
import truckIcon from "../../assets/category-truck.png";

/** Vehicle type stored on the listing (matches API). */
export type ListingTruckType =
  | "commercial"
  | "pickup"
  | "van"
  | "dump"
  | "flatbed"
  | "semi";

export interface SellListingCategoryDef {
  id: string;
  labelKey: string;
  type: ListingTruckType;
  /** Required unless imageSrc is set. */
  Icon?: LucideIcon;
  /** When set, the sell grid shows this image instead of the Lucide icon. */
  imageSrc?: string;
}

/**
 * "What do you want to sell?" — each tile maps to one API `type`.
 * User must pick one before the detailed form (avoids losing context for trailer/semi, etc.).
 */
/** Default sell category tile when mapping from stored API `type` (e.g. edit listing). */
export function defaultSellCategoryIdForType(type: ListingTruckType): string {
  const map: Record<ListingTruckType, string> = {
    commercial: "rigidTruck",
    semi: "tractorUnit",
    flatbed: "various",
    van: "van",
    dump: "machine",
    pickup: "various",
  };
  return map[type] ?? "various";
}

export const SELL_LISTING_CATEGORIES: SellListingCategoryDef[] = [
  { id: "tractorUnit", labelKey: "sellCatTractorUnit", type: "semi", imageSrc: tractorHeadIcon },
  { id: "rigidTruck", labelKey: "sellCatRigidTruck", type: "commercial", imageSrc: truckIcon },
  { id: "semiTrailers", labelKey: "sellCatSemiTrailers", type: "semi", Icon: Link2, imageSrc: semiTrailerIcon },
  { id: "van", labelKey: "sellCatVan", type: "van", Icon: Caravan },
  { id: "agriculture", labelKey: "sellCatAgriculture", type: "pickup", Icon: Tractor },
  { id: "machine", labelKey: "sellCatMachine", type: "dump", Icon: Forklift },
  { id: "various", labelKey: "sellCatVarious", type: "pickup", Icon: LayoutGrid },
];
