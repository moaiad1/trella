import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { Header } from "./Header";
import { SiteFooter } from "./SiteFooter";
import { trackPageview } from "../lib/analytics";

export function RootLayout() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname + location.search;
    if (lastPath.current === path) return;
    lastPath.current = path;
    trackPageview(path);
  }, [location]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      {/* grow (not flex-1 / flex-basis-0) avoids main collapsing on wide viewports in some flex+RTL setups */}
      <main className="relative z-0 min-w-0 grow">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
