import { Outlet } from "react-router";
import { Header } from "./Header";
import { SiteFooter } from "./SiteFooter";

export function RootLayout() {
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
