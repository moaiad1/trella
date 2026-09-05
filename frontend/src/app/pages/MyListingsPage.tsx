import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Loader2, Pencil, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Truck } from "../context/TruckContext";
import { getApiBase } from "../lib/apiBase";
import { listingRefDisplay } from "../lib/listingDefaults";
import { SarAmount } from "../components/SarAmount";

const apiBase = getApiBase();

export function MyListingsPage() {
  const { getAccessToken } = useAuth();
  const { t, language } = useLanguage();
  const [items, setItems] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState<{
    truckId: string;
    kind: "active" | "reserved" | "sold";
  } | null>(null);

  const setListingStatus = async (
    truckId: string,
    listingStatus: "active" | "reserved" | "sold",
  ) => {
    const token = getAccessToken();
    if (!token) return;
    setStatusBusy({ truckId, kind: listingStatus });
    try {
      const res = await fetch(`${apiBase}/trucks/${encodeURIComponent(truckId)}/listing-status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = (await res.json()) as Truck;
      setItems((prev) => prev.map((t) => (t.id === truckId ? updated : t)));
      toast.success(t("listingStatusUpdated"));
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setStatusBusy(null);
    }
  };

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/me/listings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Truck[];
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatPrice = (price: number) => formatSar(price, language);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("myAdvertsTitle")}</h1>
        <p className="text-gray-600 mb-8">{t("myAdvertsSubtitle")}</p>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-12 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : items.length === 0 ? (
              <div className="space-y-4 py-4">
                <p className="text-gray-500">{t("myAdvertsEmpty")}</p>
                <Button asChild>
                  <Link to="/add-truck">{t("sellYourTruck")}</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-4">
                {items.map((truck) => (
                  <li
                    key={truck.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-gray-200 rounded-lg p-4 bg-gray-50/80"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-muted-foreground mb-1">
                        {t("listingRef")}: {listingRefDisplay(truck)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/truck/${truck.id}`}
                          className="font-semibold text-blue-600 hover:underline text-lg"
                        >
                          {truck.year} {truck.make} {truck.model}
                        </Link>
                        {truck.listingStatus === "reserved" ? (
                          <Badge className="bg-amber-500 hover:bg-amber-500">{t("statusReserved")}</Badge>
                        ) : null}
                        {truck.listingStatus === "sold" ? (
                          <Badge variant="secondary">{t("statusSold")}</Badge>
                        ) : null}
                      </div>
                      <p className="text-blue-700 font-medium mt-1">
                        <SarAmount price={truck.price} language={language} />
                      </p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{truck.location}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/truck/${truck.id}`}>
                          <ExternalLink className="w-4 h-4 mr-1" />
                          {t("viewListing")}
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link to={`/edit-truck/${truck.id}`}>
                          <Pencil className="w-4 h-4 mr-1" />
                          {t("editListing")}
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-amber-300 text-amber-900 hover:bg-amber-50"
                        disabled={statusBusy?.truckId === truck.id}
                        onClick={() => void setListingStatus(truck.id, "reserved")}
                      >
                        {statusBusy?.truckId === truck.id &&
                        statusBusy.kind === "reserved" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t("btnReserved")
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-800 hover:bg-red-50"
                        disabled={statusBusy?.truckId === truck.id}
                        onClick={() => void setListingStatus(truck.id, "sold")}
                      >
                        {statusBusy?.truckId === truck.id && statusBusy.kind === "sold" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t("btnSold")
                        )}
                      </Button>
                      {truck.listingStatus === "reserved" || truck.listingStatus === "sold" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-muted-foreground/40 text-muted-foreground hover:bg-muted/50"
                          disabled={statusBusy?.truckId === truck.id}
                          onClick={() => void setListingStatus(truck.id, "active")}
                          title={t("btnBackToActiveHelp")}
                        >
                          {statusBusy?.truckId === truck.id &&
                          statusBusy.kind === "active" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4 mr-1" />
                              {t("btnBackToActive")}
                            </>
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to="/inventory">{t("backToInventory")}</Link>
          </Button>
          <Button asChild>
            <Link to="/add-truck">{t("sellYourTruck")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
