import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import { Facebook, Globe, Instagram, Linkedin, MessageCircle, X, Youtube } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const ASK_WIDGET_STORAGE_KEY = "trella.footerAskWidget.hidden";

export function FloatingAskQuestionsWidget() {
  const { t } = useLanguage();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(ASK_WIDGET_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const dismiss = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.setItem(ASK_WIDGET_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
  }, []);

  if (hidden) return null;

  return (
    <div
      className="fixed bottom-5 end-5 z-50 flex items-stretch rounded-full bg-white text-neutral-900 shadow-lg ring-1 ring-black/10"
      role="complementary"
      aria-label={t("footerAnyQuestions")}
    >
      <Link
        to="/contact"
        className="flex items-center gap-3 rounded-s-full py-2.5 ps-5 pe-2 text-sm font-medium hover:bg-neutral-50"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600"
          aria-hidden
        >
          <MessageCircle className="h-5 w-5 text-white" strokeWidth={2} />
        </span>
        <span>{t("footerAnyQuestions")}</span>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        className="flex items-center rounded-e-full px-3 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
        aria-label={t("footerDismissQuestionWidget")}
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

export function SiteFooter() {
  const { t, language, toggleLanguage } = useLanguage();

  const social = useMemo(
    () =>
      [
        { Icon: Facebook, href: "https://www.facebook.com", label: "Facebook" },
        { Icon: Youtube, href: "https://www.youtube.com", label: "YouTube" },
        { Icon: Instagram, href: "https://www.instagram.com", label: "Instagram" },
        { Icon: Linkedin, href: "https://www.linkedin.com", label: "LinkedIn" },
      ] as const,
    [],
  );

  const linkClass = "text-sm text-neutral-400 hover:text-white transition-colors";

  return (
    <>
      <footer id="contact" className="bg-[#111111] text-neutral-300">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("footerColBuy")}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/inventory" className={linkClass}>
                    {t("footerViewStock")}
                  </Link>
                </li>
                <li>
                  <Link to="/inventory" className={linkClass}>
                    {t("footerHowToBuy")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("footerColSell")}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/add-truck" className={linkClass}>
                    {t("footerStartSelling")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("footerColHelp")}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/contact" className={linkClass}>
                    {t("footerContact")}
                  </Link>
                </li>
                <li>
                  <span className="text-sm text-neutral-600">{t("footerCareers")}</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("footerColLearn")}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/" className={linkClass}>
                    {t("footerAbout")}
                  </Link>
                </li>
                <li>
                  <span className="text-sm text-neutral-600">{t("footerNews")}</span>
                </li>
                <li>
                  <span className="text-sm text-neutral-600">{t("footerEthics")}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-800">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="flex items-center gap-4">
              {social.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-500 transition hover:text-white"
                  aria-label={t("footerSocialAria").replace("{network}", label)}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </a>
              ))}
            </div>

            <div className="flex flex-1 flex-col items-center gap-3 text-center text-sm text-neutral-500 lg:px-8">
              <span>{t("footerSubscribeNewsletter")}</span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <a href="#" className="hover:text-neutral-400">
                  {t("footerPrivacy")}
                </a>
                <span aria-hidden className="text-neutral-700">
                  |
                </span>
                <a href="#" className="hover:text-neutral-400">
                  {t("footerCookie")}
                </a>
                <span aria-hidden className="text-neutral-700">
                  |
                </span>
                <a href="#" className="hover:text-neutral-400">
                  {t("footerSitemap")}
                </a>
              </div>
              <p className="text-xs text-neutral-600">{t("footerCopyright")}</p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <button
                type="button"
                onClick={toggleLanguage}
                className="inline-flex items-center gap-2 rounded-md border border-neutral-600 px-4 py-2 text-sm text-white transition hover:border-neutral-400 hover:bg-white/5"
              >
                <Globe className="h-4 w-4" />
                {language === "ar" ? "العربية" : language === "ur" ? "اردو" : "English"}
              </button>
            </div>
          </div>
        </div>
      </footer>

      <FloatingAskQuestionsWidget />
    </>
  );
}
