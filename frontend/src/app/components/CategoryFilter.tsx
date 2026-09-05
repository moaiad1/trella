import type { LucideIcon } from "lucide-react";
import { Caravan, Tractor } from "lucide-react";
import tractorHeadIcon from "../../assets/category-tractor-head.png";
import semiTrailerIcon from "../../assets/category-semi-trailer.svg";
import truckIcon from "../../assets/category-truck.png";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "./ui/utils";

type CategoryDef =
  | { id: string; labelKey: string; kind: "image"; src: string }
  | { id: string; labelKey: string; kind: "lucide"; Icon: LucideIcon };

export interface CategoryFilterProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string) => void;
  categoryCounts: Record<string, number>;
  variant?: "page" | "header";
}

const CATEGORY_DEFS: CategoryDef[] = [
  { id: "tractorhead", labelKey: "catTractorhead", kind: "image", src: tractorHeadIcon },
  { id: "truck", labelKey: "catTruckRigid", kind: "image", src: truckIcon },
  { id: "lightCommercial", labelKey: "catLightCommercialVehicle", kind: "lucide", Icon: Caravan },
  { id: "construction", labelKey: "catConstructionEquipment", kind: "lucide", Icon: Tractor },
  { id: "semiTrailer", labelKey: "catSemiTrailer", kind: "image", src: semiTrailerIcon },
];

export function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  categoryCounts,
  variant = "page",
}: CategoryFilterProps) {
  const { t } = useLanguage();

  const isHeader = variant === "header";

  const inner = (
    <div
      className={cn(
        isHeader
          ? "flex flex-wrap justify-end gap-2 sm:gap-3 md:gap-5 py-0.5 items-center"
          : "flex justify-start overflow-x-auto scrollbar-hide gap-6 md:gap-8 pb-2 items-start",
      )}
    >
      {CATEGORY_DEFS.map((def) => {
        const { id, labelKey } = def;
        const Lucide = def.kind === "lucide" ? def.Icon : null;
        const count = categoryCounts[id] ?? 0;
        const label = t(labelKey);
        const title = `${label} (${count})`;
        const isSelected = selectedCategory !== null && selectedCategory === id;

        const iconBox = isHeader ? "h-9 w-10" : "h-8 w-10";
        const imgClass = cn(
          "max-h-full max-w-full object-contain object-center",
          isHeader ? "h-8 w-8 opacity-90" : "h-7 w-7 opacity-[0.72]",
        );
        const lucideClass = "h-7 w-7 shrink-0 text-gray-500";

        return (
          <button
            key={id}
            type="button"
            title={title}
            aria-label={title}
            onClick={() => onCategoryChange(id)}
            className={cn(
              "flex flex-col items-center flex-shrink-0 rounded-md border border-transparent bg-transparent transition-colors",
              isHeader ? "gap-1 min-w-[72px] max-w-[104px] px-1.5 py-1" : "gap-1.5 min-w-[76px] max-w-[100px] px-1 py-1.5",
              "hover:bg-gray-50 hover:border-gray-200/80",
              isSelected && "bg-gray-50 border-gray-300 ring-1 ring-gray-300/60",
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center",
                iconBox,
              )}
              aria-hidden
            >
              {def.kind === "image" ? (
                <img src={def.src} alt="" className={imgClass} />
              ) : Lucide ? (
                <Lucide className={lucideClass} strokeWidth={1.25} aria-hidden />
              ) : null}
            </span>
            <span
              className={cn(
                "w-full text-center text-gray-500 font-normal",
                isHeader ? "text-[10px] leading-[1.15]" : "text-[10px] sm:text-[11px] leading-tight",
              )}
            >
              {label}
            </span>
            <span
              className={cn(
                "tabular-nums text-gray-400",
                isHeader ? "text-[10px] leading-none" : "text-[10px] sm:text-[11px] leading-none",
              )}
            >
              ({count})
            </span>
          </button>
        );
      })}
    </div>
  );

  if (variant === "header") {
    return inner;
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">{inner}</div>
    </div>
  );
}
