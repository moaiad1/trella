import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { AccountSecuritySection } from "../components/AccountSecuritySection";
import { CompanyProfileSection } from "../components/CompanyProfileSection";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2, MessageSquare } from "lucide-react";

import { getApiBase } from "../lib/apiBase";

const apiBase = getApiBase();

export interface SellerInquiry {
  id: number;
  truckId: string;
  truckLabel: string;
  truckRefNo?: string;
  buyerEmail: string;
  createdAt: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface BuyerInquiry {
  id: number;
  truckId: string;
  truckLabel: string;
  truckRefNo?: string;
  createdAt: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
}

export function ProfilePage() {
  const { user, getAccessToken } = useAuth();
  const { t } = useLanguage();
  const [showSecurity, setShowSecurity] = useState(false);
  const [sellerItems, setSellerItems] = useState<SellerInquiry[]>([]);
  const [buyerItems, setBuyerItems] = useState<BuyerInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInquiries = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [sellerRes, buyerRes] = await Promise.all([
        fetch(`${apiBase}/me/seller-inquiries`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/me/buyer-inquiries`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!sellerRes.ok) throw new Error(await sellerRes.text());
      if (!buyerRes.ok) throw new Error(await buyerRes.text());
      const s = (await sellerRes.json()) as SellerInquiry[];
      const b = (await buyerRes.json()) as BuyerInquiry[];
      setSellerItems(Array.isArray(s) ? s : []);
      setBuyerItems(Array.isArray(b) ? b : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void loadInquiries();
  }, [loadInquiries]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("profileTitle")}</h1>
        <p className="text-gray-600 mb-6">{t("profileSubtitle")}</p>

        <Card className="mb-8 border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("accountDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-800">
            <p>
              <span className="text-muted-foreground">{t("email")}: </span>
              <span className="font-medium">{user?.email ?? "—"}</span>
            </p>
            {(user?.firstName || user?.lastName) ? (
              <p>
                <span className="text-muted-foreground">{t("fullNameLabel")}: </span>
                <span className="font-medium">
                  {[user?.firstName, user?.lastName].filter(Boolean).join(" ")}
                </span>
              </p>
            ) : null}
            {user?.phone ? (
              <p>
                <span className="text-muted-foreground">{t("mobileNumber")}: </span>
                <span className="font-medium" dir="ltr">
                  {user.phone}
                </span>
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full sm:w-auto"
              onClick={() => setShowSecurity((open) => !open)}
            >
              {showSecurity ? t("hideSecuritySettings") : t("manageSecuritySettings")}
            </Button>
            {showSecurity ? (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <AccountSecuritySection />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {user?.accountType === "company" ? (
          <Card className="mb-8 border-gray-200">
            <CardContent className="pt-6">
              <CompanyProfileSection />
            </CardContent>
          </Card>
        ) : null}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="w-5 h-5" />
              {t("buyerMessagesTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : sellerItems.length === 0 ? (
              <p className="text-gray-500 py-4">{t("noBuyerMessages")}</p>
            ) : (
              <ul className="space-y-4">
                {sellerItems.map((m) => (
                  <li
                    key={m.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50/80 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap justify-between gap-2 mb-1">
                        <Link
                          to={`/truck/${m.truckId}`}
                          className="font-semibold text-blue-600 hover:underline truncate"
                        >
                          {m.truckLabel}
                        </Link>
                        <time className="text-xs text-gray-500 shrink-0">
                          {new Date(m.lastMessageAt || m.createdAt).toLocaleString()}
                        </time>
                      </div>
                      {m.truckRefNo ? (
                        <p className="text-xs font-mono text-muted-foreground mb-1">
                          {t("listingRef")}: {m.truckRefNo}
                        </p>
                      ) : null}
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{t("fromBuyer")}</span> {m.buyerEmail}
                      </p>
                      <p className="text-gray-700 text-sm mt-1 line-clamp-2">{m.lastMessagePreview}</p>
                      {m.unreadCount > 0 ? (
                        <span className="inline-block mt-2 text-xs font-medium text-white bg-blue-600 rounded-full px-2 py-0.5">
                          {m.unreadCount} {t("unreadMessages")}
                        </span>
                      ) : null}
                    </div>
                    <Button asChild className="shrink-0 w-full sm:w-auto">
                      <Link to={`/account/chat/${m.id}`}>{t("openChat")}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="w-5 h-5" />
              {t("yourMessagesToSellers")}
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              {t("yourMessagesToSellersHelp")}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : error ? null : buyerItems.length === 0 ? (
              <p className="text-gray-500 py-2">{t("noSentMessages")}</p>
            ) : (
              <ul className="space-y-4">
                {buyerItems.map((m) => (
                  <li
                    key={m.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50/80 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap justify-between gap-2 mb-1">
                        <Link
                          to={`/truck/${m.truckId}`}
                          className="font-semibold text-blue-600 hover:underline truncate"
                        >
                          {m.truckLabel}
                        </Link>
                        <time className="text-xs text-gray-500 shrink-0">
                          {new Date(m.lastMessageAt || m.createdAt).toLocaleString()}
                        </time>
                      </div>
                      {m.truckRefNo ? (
                        <p className="text-xs font-mono text-muted-foreground mb-1">
                          {t("listingRef")}: {m.truckRefNo}
                        </p>
                      ) : null}
                      <p className="text-gray-700 text-sm line-clamp-2">{m.lastMessagePreview}</p>
                      {m.unreadCount > 0 ? (
                        <span className="inline-block mt-2 text-xs font-medium text-white bg-blue-600 rounded-full px-2 py-0.5">
                          {m.unreadCount} {t("unreadMessages")}
                        </span>
                      ) : null}
                    </div>
                    <Button asChild className="shrink-0 w-full sm:w-auto">
                      <Link to={`/account/chat/${m.id}`}>{t("openChat")}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button variant="outline" asChild>
            <Link to="/inventory">{t("backToInventory")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
