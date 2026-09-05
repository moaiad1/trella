import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useTrucks } from "../context/TruckContext";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { 
  MapPin, 
  Calendar, 
  Gauge, 
  Fuel, 
  Settings, 
  Building, 
  User, 
  ArrowLeft,
  Phone,
  Mail,
  CheckCircle
} from "lucide-react";

import { getApiBase } from "../lib/apiBase";
import { DEFAULT_LISTING_IMAGE, listingRefDisplay } from "../lib/listingDefaults";
import { SarAmount } from "../components/SarAmount";
import type { Truck } from "../context/TruckContext";

const apiBase = getApiBase();

export function TruckDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { trucks } = useTrucks();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { user, getAccessToken } = useAuth();
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [fetchedTruck, setFetchedTruck] = useState<Truck | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  const truckFromList = id ? trucks.find((x) => x.id === id) : undefined;
  const truck = truckFromList ?? fetchedTruck;

  useEffect(() => {
    if (!id) return;
    if (trucks.some((x) => x.id === id)) {
      setFetchedTruck(null);
      return;
    }
    let cancelled = false;
    setFetchingDetail(true);
    (async () => {
      try {
        const res = await fetch(`${apiBase}/trucks/${encodeURIComponent(id)}`);
        if (!res.ok) {
          if (!cancelled) setFetchedTruck(null);
          return;
        }
        const data = (await res.json()) as Truck;
        if (!cancelled) setFetchedTruck(data);
      } catch {
        if (!cancelled) setFetchedTruck(null);
      } finally {
        if (!cancelled) setFetchingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, trucks]);

  const galleryImages = useMemo(
    () => (truck?.images?.length ? truck.images : [DEFAULT_LISTING_IMAGE]),
    [truck?.images],
  );

  useEffect(() => {
    setGalleryIndex(0);
  }, [truck?.id]);

  if (!truck && fetchingDetail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  if (!truck) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t("truckNotFound")}</h1>
          <Button onClick={() => navigate("/inventory")}>{t("backToInventory")}</Button>
        </div>
      </div>
    );
  }

  const listingStatus = truck.listingStatus ?? "active";
  const isSold = listingStatus === "sold";
  const isReserved = listingStatus === "reserved";
  const isListingActive = listingStatus === "active";

  const formatMileage = (mileage: number) => {
    return new Intl.NumberFormat("en-US").format(mileage);
  };

  const sellerPhone = truck.sellerPhone?.trim() ?? "";
  const isOwner =
    user != null &&
    truck.ownerUserId != null &&
    truck.ownerUserId === user.id;

  const sendInquiry = async (e: FormEvent) => {
    e.preventDefault();
    const body = messageText.trim();
    if (!body) return;
    if (!isListingActive) {
      toast.error(t("listingInactiveNoContact"));
      return;
    }
    const token = getAccessToken();
    if (!token) {
      toast.error(t("loginToSendMessage"));
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${apiBase}/trucks/${truck.id}/inquiries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      setMessageText("");
      toast.success(t("messageSentSuccess"));
    } catch {
      toast.error(t("messageSendFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("back")}
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <img
                src={galleryImages[galleryIndex] ?? galleryImages[0]}
                alt={`${truck.year} ${truck.make} ${truck.model}`}
                className="w-full h-96 object-cover"
              />
              {galleryImages.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto border-t border-gray-100 bg-gray-50 p-2">
                  {galleryImages.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setGalleryIndex(i)}
                      className={`h-16 w-20 shrink-0 overflow-hidden rounded border-2 transition-colors ${
                        i === galleryIndex
                          ? "border-blue-600"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {truck.videoUrl?.trim() ? (
              <div className="overflow-hidden rounded-lg bg-white shadow">
                <video
                  src={truck.videoUrl}
                  controls
                  className="max-h-[min(480px,70vh)] w-full bg-black"
                />
              </div>
            ) : null}

            {isSold ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900 text-sm font-medium">
                {t("listingSoldBanner")}
              </div>
            ) : isReserved ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm font-medium">
                {t("listingReservedBanner")}
              </div>
            ) : null}

            {/* Details */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {truck.year} {truck.make} {truck.model}
                    </h1>
                    <p className="text-sm text-muted-foreground font-mono mb-2">
                      {t("listingRef")}: {listingRefDisplay(truck)}
                    </p>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{truck.location}</span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-3xl font-bold text-blue-600">
                      <SarAmount price={truck.price} language={language} />
                    </p>
                    <Badge className="mt-2 capitalize bg-blue-600">
                      {t(truck.type)}
                    </Badge>
                  </div>
                </div>

                {/* Key Specs Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-t border-b border-gray-200">
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Gauge className="w-4 h-4" />
                      <span className="text-sm">{t("mileage")}</span>
                    </div>
                    <p className="font-semibold">{formatMileage(truck.mileage)} {t("miles")}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{t("year")}</span>
                    </div>
                    <p className="font-semibold">{truck.year}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">{t("transmission")}</span>
                    </div>
                    <p className="font-semibold capitalize">{t(truck.transmission)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Fuel className="w-4 h-4" />
                      <span className="text-sm">{t("fuelType")}</span>
                    </div>
                    <p className="font-semibold capitalize">{t(truck.fuelType)}</p>
                  </div>
                </div>

                {/* Description */}
                {truck.description.trim() ? (
                  <div className="mt-6">
                    <h2 className="text-xl font-semibold mb-3">{t("description")}</h2>
                    <p className="text-gray-700 leading-relaxed">{truck.description}</p>
                  </div>
                ) : null}

                {/* Features */}
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-3">{t("features")}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {truck.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Condition Badge */}
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-3">{t("condition")}</h2>
                  <Badge variant="outline" className="capitalize text-base px-4 py-2">
                    {t(truck.condition)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Seller Info */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">{t("sellerInformation")}</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    {truck.seller === "company" ? (
                      <Building className="w-5 h-5 text-gray-600 mt-0.5" />
                    ) : (
                      <User className="w-5 h-5 text-gray-600 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">{truck.sellerName}</p>
                      <p className="text-sm text-gray-600 capitalize">{t(truck.seller)}</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 space-y-3">
                    {sellerPhone ? (
                      <Button className="w-full" asChild>
                        <a href={`tel:${sellerPhone.replace(/\s/g, "")}`}>
                          <Phone className="w-4 h-4 mr-2" />
                          {t("callSeller")}
                        </a>
                      </Button>
                    ) : (
                      <Button className="w-full" type="button" disabled variant="secondary">
                        <Phone className="w-4 h-4 mr-2" />
                        {t("callSeller")}
                      </Button>
                    )}
                    {isOwner ? (
                      <p className="text-sm text-gray-600 text-center">{t("ownListingNoMessage")}</p>
                    ) : truck.ownerUserId == null ? (
                      <p className="text-sm text-gray-500 text-center">
                        {t("listingCannotReceiveMessages")}
                      </p>
                    ) : !isListingActive ? (
                      <p className="text-sm text-gray-600 text-center">
                        {t("listingInactiveNoContact")}
                      </p>
                    ) : !user ? (
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/login">{t("loginToSendMessage")}</Link>
                      </Button>
                    ) : (
                      <form onSubmit={sendInquiry} className="space-y-2">
                        <div className="flex items-start gap-2 text-gray-600">
                          <Mail className="w-4 h-4 mt-1 shrink-0" />
                          <span className="text-sm font-medium">{t("sendMessage")}</span>
                        </div>
                        <Textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder={t("messagePlaceholder")}
                          rows={4}
                          className="resize-none"
                        />
                        <Button type="submit" className="w-full" variant="outline" disabled={sending}>
                          {t("sendMessageAction")}
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Info */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">{t("additionalInformation")}</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("listed")}</span>
                    <span className="font-medium">
                      {new Date(truck.dateAdded).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("location")}</span>
                    <span className="font-medium">{truck.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("type")}</span>
                    <span className="font-medium capitalize">{t(truck.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("condition")}</span>
                    <span className="font-medium capitalize">{t(truck.condition)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interest Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">{t("interestedTitle")}</h3>
                <p className="text-sm text-gray-700 mb-4">
                  {t("interestedDesc")}
                </p>
                <Button className="w-full" variant="default">
                  {t("requestInformation")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}