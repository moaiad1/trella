import { useState } from "react";
import { Link } from "react-router";
import { MapPin, Calendar, Gauge, Building, User, Archive, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Truck, useTrucks } from "../context/TruckContext";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { DEFAULT_LISTING_IMAGE, listingRefDisplay } from "../lib/listingDefaults";
import { SarAmount } from "./SarAmount";
import { getApiBase } from "../lib/apiBase";

const apiBase = getApiBase();

interface TruckCardProps {
  truck: Truck;
}

export function TruckCard({ truck }: TruckCardProps) {
  const { t, language } = useLanguage();
  const { user, getAccessToken } = useAuth();
  const { deleteTruck, refreshTrucks } = useTrucks();
  const [busy, setBusy] = useState<"delete" | "archive" | null>(null);
  const coverImage = truck.images?.[0] ?? DEFAULT_LISTING_IMAGE;

  const onDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(t("adminConfirmDelete"))) return;
    setBusy("delete");
    try {
      await deleteTruck(truck.id);
      toast.success(t("adminListingDeleted"));
    } catch {
      toast.error(t("adminListingDeleteFailed"));
    } finally {
      setBusy(null);
    }
  };

  const onArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(t("adminConfirmArchive"))) return;
    setBusy("archive");
    try {
      const token = getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${apiBase}/trucks/${encodeURIComponent(truck.id)}/listing-status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ listingStatus: "archived" }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshTrucks();
      toast.success(t("adminListingArchived"));
    } catch {
      toast.error(t("adminListingArchiveFailed"));
    } finally {
      setBusy(null);
    }
  };

  const formatMileage = (mileage: number) => {
    return new Intl.NumberFormat("en-US").format(mileage);
  };

  return (
    <Link to={`/truck/${truck.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="relative h-48 bg-gray-200">
          <img
            src={coverImage}
            alt={`${truck.year} ${truck.make} ${truck.model}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-black/55 text-white border-0 text-xs font-mono">
              {listingRefDisplay(truck)}
            </Badge>
          </div>
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
            {truck.listingStatus === "reserved" ? (
              <Badge className="bg-amber-500 text-white hover:bg-amber-500">{t("statusReserved")}</Badge>
            ) : null}
            <Badge className="bg-blue-600 text-white">{t(truck.type)}</Badge>
          </div>
          {user?.isAdmin ? (
            <div className="absolute bottom-3 left-3 flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-black/55 text-white hover:bg-black/70"
                title={t("adminArchiveListing")}
                aria-label={t("adminArchiveListing")}
                disabled={busy !== null}
                onClick={onArchive}
              >
                {busy === "archive" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-black/55 text-white hover:bg-red-600"
                title={t("adminDeleteListing")}
                aria-label={t("adminDeleteListing")}
                disabled={busy !== null}
                onClick={onDelete}
              >
                {busy === "delete" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : null}
        </div>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-lg">
                {truck.year} {truck.make} {truck.model}
              </h3>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                <SarAmount price={truck.price} language={language} />
              </p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600 mt-4">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              <span>{formatMileage(truck.mileage)} {t("miles")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{t(truck.transmission)} • {t(truck.fuelType)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{truck.location}</span>
            </div>
            <div className="flex items-center gap-2">
              {truck.seller === "company" ? (
                <Building className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span className="truncate">{truck.sellerName}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Badge variant="outline" className="capitalize">
              {t(truck.condition)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}