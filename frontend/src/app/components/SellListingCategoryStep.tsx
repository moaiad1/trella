import { useRef } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { useLanguage } from "../context/LanguageContext";
import type { SellListingCategoryDef } from "../lib/sellListingCategories";

interface SellListingCategoryStepProps {
  categories: SellListingCategoryDef[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
  continueLabelKey: string;
  /** Optional: analyze a photo with AI to pre-select a category (requires server OPENAI_API_KEY). */
  onSuggestFromPhoto?: (file: File) => Promise<void>;
  suggestFromPhotoPending?: boolean;
}

export function SellListingCategoryStep({
  categories,
  selectedId,
  onSelect,
  onContinue,
  continueLabelKey,
  onSuggestFromPhoto,
  suggestFromPhotoPending = false,
}: SellListingCategoryStepProps) {
  const { t } = useLanguage();
  const photoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {categories.map(({ id, labelKey, Icon, imageSrc }) => {
          const selected = selectedId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border-2 bg-white p-4 min-h-[112px] transition-colors",
                "hover:border-blue-300 hover:bg-blue-50/50",
                selected
                  ? "border-blue-600 ring-2 ring-blue-200 bg-blue-50/80"
                  : "border-gray-200",
              )}
            >
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt=""
                  className={cn(
                    "h-10 w-10 sm:h-12 sm:w-12 object-contain shrink-0",
                    selected ? "opacity-100" : "opacity-[0.88]",
                  )}
                  aria-hidden
                />
              ) : Icon ? (
                <Icon
                  className={cn(
                    "h-10 w-10 sm:h-12 sm:w-12",
                    selected ? "text-blue-700" : "text-gray-800",
                  )}
                  strokeWidth={1.25}
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "text-xs sm:text-sm text-center font-medium leading-tight",
                  selected ? "text-blue-900" : "text-gray-800",
                )}
              >
                {t(labelKey)}
              </span>
            </button>
          );
        })}
      </div>

      {onSuggestFromPhoto ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-4">
          <p className="text-sm text-gray-600 mb-3">{t("aiCategoryStepHint")}</p>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              await onSuggestFromPhoto(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={suggestFromPhotoPending}
            onClick={() => photoInputRef.current?.click()}
          >
            {suggestFromPhotoPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            {t("aiCategorySuggestFromPhoto")}
          </Button>
        </div>
      ) : null}

      <div className="flex justify-start pt-2">
        <Button
          type="button"
          size="lg"
          className="min-w-[140px] bg-blue-600 hover:bg-blue-700"
          disabled={selectedId == null}
          onClick={onContinue}
        >
          {t(continueLabelKey)}
        </Button>
      </div>
    </div>
  );
}
