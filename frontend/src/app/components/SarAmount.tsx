import sarSymbol from "../../assets/saudi-riyal-symbol.png";
import type { AppLanguage } from "../lib/formatSar";
import { formatSarNumber } from "../lib/formatSar";
import { cn } from "./ui/utils";

type SarAmountProps = {
  price: number;
  language: AppLanguage;
  className?: string;
  /** Applied to the riyal glyph image (e.g. `h-4` on compact rows). */
  symbolClassName?: string;
};

export function SarAmount({ price, language, className, symbolClassName }: SarAmountProps) {
  return (
    <span aria-label={`${formatSarNumber(price, language)} Saudi riyals`} className={cn("inline-flex items-center gap-1", className)} dir="ltr">
      <span className="tabular-nums">{formatSarNumber(price, language)}</span>
      <img
        src={sarSymbol}
        alt=""
        className={cn("h-[1em] w-auto shrink-0 object-contain [image-rendering:-webkit-optimize-contrast]", symbolClassName)}
        aria-hidden
        draggable={false}
      />
    </span>
  );
}
