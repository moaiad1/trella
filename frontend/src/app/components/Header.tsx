import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import type { NavigateFunction } from "react-router";
import { Truck, Plus, Menu, Languages, Bell, User, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useAuth } from "../context/AuthContext";
import { useLanguage, type Language } from "../context/LanguageContext";
import { useTrucks } from "../context/TruckContext";
import { CategoryFilter } from "./CategoryFilter";
import { computeCategoryCounts } from "../lib/categoryInventory";
import { fetchChatThreads, type ChatThreadSummary } from "../lib/chatApi";

const bellTriggerClass =
  "relative z-30 px-2 [&_svg]:pointer-events-auto touch-manipulation";

const LANGUAGE_LABELS: Record<Language, string> = {
  ar: "العربية",
  en: "English",
  ur: "اردو",
};

function LanguageMenu({
  language,
  setLanguage,
  compact,
}: {
  language: Language;
  setLanguage: (lang: Language) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const sheetSide = language === "en" ? "right" : "left";

  const pick = (lang: Language) => {
    setLanguage(lang);
    setOpen(false);
  };

  // Sheet, not DropdownMenu: Radix Dropdown behind the sticky header + category row is unreliable on desktop (see ChatNotificationsMenu above).
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={
            compact
              ? "flex shrink-0 items-center gap-1.5 px-2"
              : "flex items-center gap-2"
          }
          aria-label={LANGUAGE_LABELS[language]}
        >
          <Languages className={compact ? "h-4 w-4" : "w-4 h-4"} />
          <span className={compact ? "text-xs" : undefined}>{LANGUAGE_LABELS[language]}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side={sheetSide} className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xs">
        <SheetHeader className="border-b px-4 py-4 text-start">
          <SheetTitle>{LANGUAGE_LABELS[language]}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 p-2">
          {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
            <button
              key={lang}
              type="button"
              className={`w-full rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-accent ${
                lang === language ? "bg-accent font-medium" : ""
              }`}
              onClick={() => pick(lang)}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ChatNotificationsMenu({
  chatThreads,
  chatUnread,
  t,
  navigate,
  language,
}: {
  chatThreads: ChatThreadSummary[];
  chatUnread: number;
  t: (key: string) => string;
  navigate: NavigateFunction;
  language: Language;
}) {
  const sheetSide = language === "en" ? "right" : "left";
  const [sheetOpen, setSheetOpen] = useState(false);

  const go = (path: string) => {
    setSheetOpen(false);
    navigate(path);
  };

  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={bellTriggerClass}
      aria-label={t("chatNotificationsTitle")}
    >
      <Bell className="w-5 h-5" />
      {chatUnread > 0 ? (
        <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] pointer-events-none">
          {chatUnread > 99 ? "99+" : chatUnread}
        </Badge>
      ) : null}
    </Button>
  );

  /* Sheet on all breakpoints: Radix Dropdown behind the sticky header + category row was unreliable on desktop. */
  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>{triggerButton}</SheetTrigger>
      <SheetContent side={sheetSide} className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-4 text-start">
          <SheetTitle>{t("chatNotificationsTitle")}</SheetTitle>
        </SheetHeader>
        <div className="flex max-h-[min(24rem,70vh)] flex-col gap-0 overflow-y-auto px-2 py-3">
          {chatThreads.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">{t("noChatThreads")}</p>
          ) : (
            chatThreads.map((th) => (
              <button
                key={`${th.role}-${th.inquiryId}`}
                type="button"
                className="flex w-full flex-col items-start gap-0.5 rounded-md border border-transparent px-3 py-3 text-start transition-colors hover:bg-accent"
                onClick={() => go(`/account/chat/${th.inquiryId}`)}
              >
                <span className="w-full truncate font-medium">{th.truckLabel}</span>
                {th.truckRefNo ? (
                  <span className="font-mono text-[10px] text-muted-foreground">{th.truckRefNo}</span>
                ) : null}
                <span className="line-clamp-2 w-full text-xs text-muted-foreground">{th.preview}</span>
                {th.unreadCount > 0 ? (
                  <span className="text-xs font-medium text-blue-600">
                    {th.unreadCount} {t("unreadMessages")}
                  </span>
                ) : null}
              </button>
            ))
          )}
          <Button
            type="button"
            variant="outline"
            className="mx-2 mt-2 shrink-0"
            onClick={() => go("/account")}
          >
            {t("openAccountMessages")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { user, logout, getAccessToken } = useAuth();
  const { trucks } = useTrucks();
  const [chatThreads, setChatThreads] = useState<ChatThreadSummary[]>([]);
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setChatThreads([]);
      setChatUnread(0);
      return;
    }
    const load = async () => {
      try {
        const data = await fetchChatThreads(getAccessToken);
        setChatThreads(data.threads);
        setChatUnread(data.totalUnread);
      } catch {
        /* ignore */
      }
    };
    void load();
    const tmr = window.setInterval(load, 15000);
    const onUpdated = () => {
      void load();
    };
    window.addEventListener("trella-chat-updated", onUpdated);
    window.addEventListener("focus", load);
    return () => {
      window.clearInterval(tmr);
      window.removeEventListener("trella-chat-updated", onUpdated);
      window.removeEventListener("focus", load);
    };
  }, [user, getAccessToken]);

  const categoryCounts = useMemo(() => computeCategoryCounts(trucks), [trucks]);

  const catParam = searchParams.get("cat");
  const selectedCategory =
    location.pathname === "/inventory" || location.pathname === "/" ? catParam : null;

  const onCategoryChange = (id: string) => {
    if (catParam === id) {
      navigate("/inventory");
      return;
    }
    navigate(`/inventory?cat=${encodeURIComponent(id)}`);
  };

  const categoryBar = (
    <CategoryFilter
      variant="header"
      selectedCategory={selectedCategory}
      onCategoryChange={onCategoryChange}
      categoryCounts={categoryCounts}
    />
  );

  return (
    <header className="sticky top-0 z-[100] bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile: logo at inline-start (left EN / right AR), lang|bell|menu at end. Desktop: [logo | lang | categories | nav] — dir on <html> mirrors logo for RTL. */}
        <div className="flex flex-col gap-0 md:grid md:min-h-[4.75rem] md:grid-cols-[auto_auto_minmax(0,1fr)_auto] md:items-center md:gap-3 md:py-2 md:isolate">
          <div className="flex min-h-14 items-center justify-between gap-3 py-2 md:hidden">
            <Link
              to="/"
              className="relative z-0 flex shrink-0 items-center gap-2.5 text-xl font-bold text-gray-900"
            >
              <Truck
                className="h-6 w-6 shrink-0 text-blue-600"
                strokeWidth={2}
                aria-hidden
              />
              <span className="leading-none">{t("siteName")}</span>
            </Link>
            <div className="relative z-30 flex shrink-0 items-center gap-1">
              <LanguageMenu language={language} setLanguage={setLanguage} compact />
              {user ? (
                <ChatNotificationsMenu
                  language={language}
                  chatThreads={chatThreads}
                  chatUnread={chatUnread}
                  t={t}
                  navigate={navigate}
                />
              ) : null}
              <button
                type="button"
                className="p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>

          <Link
            to="/"
            className="relative z-0 hidden shrink-0 items-center gap-2.5 text-xl font-bold text-gray-900 md:flex"
          >
            <Truck
              className="h-6 w-6 shrink-0 text-blue-600"
              strokeWidth={2}
              aria-hidden
            />
            <span className="leading-none">{t("siteName")}</span>
          </Link>

          <div className="relative z-20 hidden shrink-0 items-center md:flex">
            <LanguageMenu language={language} setLanguage={setLanguage} />
          </div>

          <div className="relative z-0 hidden min-h-0 min-w-0 items-center justify-end overflow-visible px-1 md:flex lg:px-2">
            {categoryBar}
          </div>

          <nav className="relative z-20 hidden shrink-0 items-center gap-2 bg-white md:flex md:gap-3">
            {user ? (
              <ChatNotificationsMenu
                language={language}
                chatThreads={chatThreads}
                chatUnread={chatUnread}
                t={t}
                navigate={navigate}
              />
            ) : null}
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="text-sm text-gray-700 hover:text-blue-600 transition-colors"
                >
                  {t("logIn")}
                </Link>
                <Link
                  to="/signup"
                  className="text-sm text-gray-700 hover:text-blue-600 transition-colors"
                >
                  {t("signUp")}
                </Link>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="max-w-[min(220px,28vw)] gap-1 px-2">
                  <Link to="/account" title={user.email}>
                    <User className="w-4 h-4 shrink-0" />
                    <span className="truncate text-xs">{t("profileAccount")}</span>
                  </Link>
                </Button>
                <Link
                  to="/my-listings"
                  className="text-sm text-gray-700 transition-colors hover:text-blue-600 whitespace-nowrap"
                >
                  {t("myAdverts")}
                </Link>
                {user.isAdmin ? (
                  <>
                    <Link
                      to="/admin/companies"
                      className="text-sm text-gray-700 transition-colors hover:text-blue-600 whitespace-nowrap"
                    >
                      {t("adminNavLink")}
                    </Link>
                    <Link
                      to="/admin/contact-messages"
                      className="text-sm text-gray-700 transition-colors hover:text-blue-600 whitespace-nowrap"
                    >
                      {t("adminContactMessagesNavLink")}
                    </Link>
                  </>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  onClick={() => logout()}
                  aria-label={t("logout")}
                  title={t("logout")}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button asChild>
              <Link to="/add-truck" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t("sellYourTruck")}
              </Link>
            </Button>
          </nav>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 -mx-4 px-4 py-2 sm:mx-0 sm:px-0 md:hidden">
          {categoryBar}
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-4">
              {!user ? (
                <div className="flex flex-col gap-2 w-full">
                  <Link
                    to="/login"
                    className="text-center py-2 text-gray-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("logIn")}
                  </Link>
                  <Link
                    to="/signup"
                    className="text-center py-2 text-gray-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("signUp")}
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2 w-full items-stretch">
                  <span className="text-xs text-gray-500 truncate max-w-full text-center">
                    {user.email}
                  </span>
                  <Link
                    to="/account"
                    className="text-center py-2 text-sm text-gray-700 hover:text-blue-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("profileTitle")}
                  </Link>
                  <Link
                    to="/my-listings"
                    className="text-center py-2 text-sm text-gray-700 hover:text-blue-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("myAdverts")}
                  </Link>
                  {user.isAdmin ? (
                    <>
                      <Link
                        to="/admin/companies"
                        className="text-center py-2 text-sm text-gray-700 hover:text-blue-600"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t("adminNavLink")}
                      </Link>
                      <Link
                        to="/admin/contact-messages"
                        className="text-center py-2 text-sm text-gray-700 hover:text-blue-600"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t("adminContactMessagesNavLink")}
                      </Link>
                    </>
                  ) : null}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t("logout")}
                  </Button>
                </div>
              )}
              <Button asChild className="w-full">
                <Link
                  to="/add-truck"
                  className="flex items-center justify-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Plus className="w-4 h-4" />
                  {t("sellYourTruck")}
                </Link>
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
