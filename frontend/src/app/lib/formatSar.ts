export type AppLanguage = "en" | "ar";

/** Locale-formatted digits only (no currency symbol). */
export function formatSarNumber(price: number, language: AppLanguage): string {
  const locale = language === "ar" ? "ar-SA" : "en-SA";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
