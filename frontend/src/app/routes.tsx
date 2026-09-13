import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { RequireAuth } from "./components/RequireAuth";
import { RequireAdmin } from "./components/RequireAdmin";
import { HomePage } from "./pages/HomePage";
import { InventoryPage } from "./pages/InventoryPage";
import { TruckDetailPage } from "./pages/TruckDetailPage";
import { AddTruckPage } from "./pages/AddTruckPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ChatThreadPage } from "./pages/ChatThreadPage";
import { MyListingsPage } from "./pages/MyListingsPage";
import { AdminCompaniesPage } from "./pages/AdminCompaniesPage";
import { AdminContactMessagesPage } from "./pages/AdminContactMessagesPage";
import { ContactPage } from "./pages/ContactPage";
import { NotFound } from "./pages/NotFound";

// Lazy-loaded: pulls in recharts, which only admins viewing this one page need.
const AdminAnalyticsPage = lazy(() =>
  import("./pages/AdminAnalyticsPage").then((m) => ({ default: m.AdminAnalyticsPage })),
);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "inventory", Component: InventoryPage },
      { path: "truck/:id", Component: TruckDetailPage },
      {
        path: "add-truck",
        element: (
          <RequireAuth>
            <AddTruckPage />
          </RequireAuth>
        ),
      },
      {
        path: "account",
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      {
        path: "account/chat/:inquiryId",
        element: (
          <RequireAuth>
            <ChatThreadPage />
          </RequireAuth>
        ),
      },
      {
        path: "my-listings",
        element: (
          <RequireAuth>
            <MyListingsPage />
          </RequireAuth>
        ),
      },
      {
        path: "edit-truck/:id",
        element: (
          <RequireAuth>
            <AddTruckPage />
          </RequireAuth>
        ),
      },
      {
        path: "admin/companies",
        element: (
          <RequireAdmin>
            <AdminCompaniesPage />
          </RequireAdmin>
        ),
      },
      {
        path: "admin/contact-messages",
        element: (
          <RequireAdmin>
            <AdminContactMessagesPage />
          </RequireAdmin>
        ),
      },
      {
        path: "admin/analytics",
        element: (
          <RequireAdmin>
            <Suspense fallback={null}>
              <AdminAnalyticsPage />
            </Suspense>
          </RequireAdmin>
        ),
      },
      { path: "contact", Component: ContactPage },
      { path: "login", Component: LoginPage },
      { path: "signup", Component: SignupPage },
      { path: "*", Component: NotFound },
    ],
  },
]);
