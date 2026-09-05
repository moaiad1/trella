import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useTrucks } from "../context/TruckContext";
import { useLanguage } from "../context/LanguageContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { InlineSearchSelect } from "../components/InlineSearchSelect";
import { toast } from "sonner";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { SellListingCategoryStep } from "../components/SellListingCategoryStep";
import {
  fetchMetaMakes,
  fetchMetaModelsForMake,
  fetchVehicleMakesFromDb,
  fetchVehicleModelsFromDb,
} from "../lib/vehicleCatalogApi";
import { fallbackMakes, fallbackModelsForMake } from "../lib/truckCatalogFallback";
import {
  classifyListingImage,
  isAiClassificationUnavailable,
  type ClassifyListingImageResult,
} from "../lib/classifyListingImage";
import {
  defaultSellCategoryIdForType,
  SELL_LISTING_CATEGORIES,
} from "../lib/sellListingCategories";
import { filterMakesForCategory } from "../lib/vehicleMakeCategories";
import { makeDisplayLabel } from "../lib/vehicleMakeLabels";
import {
  fetchCityWithRegion,
  fetchSaudiCities,
  fetchSaudiRegions,
  type SaudiCity,
  type SaudiRegion,
} from "../lib/saudiLocationsApi";
import { getApiBase } from "../lib/apiBase";
import { fetchPublicFeatures } from "../lib/apiFeatures";
import type { Truck } from "../context/TruckContext";
import { uploadTruckImage } from "../lib/uploadTruckImage";
import { uploadTruckVideo } from "../lib/uploadTruckVideo";
import { DEFAULT_LISTING_IMAGE, listingRefDisplay } from "../lib/listingDefaults";

const MIN_LISTING_YEAR = 1970;
const MAX_LISTING_IMAGES = 10;

const apiBase = getApiBase();

function mergeSortedUnique(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])].sort((x, y) =>
    x.localeCompare(y, undefined, { sensitivity: "base" }),
  );
}

interface TruckFormData {
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  type: "commercial" | "pickup" | "van" | "dump" | "flatbed" | "semi";
  condition: "excellent" | "good" | "fair" | "notWorking";
  transmission: "automatic" | "manual";
  fuelType: "diesel" | "gasoline" | "electric" | "hybrid";
  cityId?: number;
  seller: "individual" | "company";
  sellerName: string;
  sellerPhone: string;
  description: string;
  features: string;
}

export function AddTruckPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = Boolean(editId);
  const { addTruck, updateTruck } = useTrucks();
  const { user, getAccessToken } = useAuth();
  const { t, language } = useLanguage();
  const [flowStep, setFlowStep] = useState<"category" | "form">("category");
  const [selectedSellCategoryId, setSelectedSellCategoryId] = useState<string | null>(null);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [makesLoading, setMakesLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [regions, setRegions] = useState<SaudiRegion[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [cities, setCities] = useState<SaudiCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [regionId, setRegionId] = useState("");
  const [listingImageUrls, setListingImageUrls] = useState<string[]>([]);
  const [listingVideoUrl, setListingVideoUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [editLoading, setEditLoading] = useState(isEdit);
  const [pendingCityId, setPendingCityId] = useState<number | null>(null);
  const [categoryAiPending, setCategoryAiPending] = useState(false);
  const [listingAiPending, setListingAiPending] = useState(false);
  const [listingAiSuggestion, setListingAiSuggestion] =
    useState<ClassifyListingImageResult | null>(null);
  const [listingCategoryAiEnabled, setListingCategoryAiEnabled] = useState(false);
  const [editListingRef, setEditListingRef] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    trigger,
    formState: { errors },
  } = useForm<TruckFormData>({
    defaultValues: {
      make: "",
      model: "",
      type: "commercial",
      condition: "good",
      transmission: "automatic",
      fuelType: "diesel",
      seller: "individual",
      sellerPhone: "",
      description: "",
      features: "",
    }
  });

  const watchType = watch("type");
  const isTrailerLikeType = watchType === "flatbed" || watchType === "semi";
  const makeOptions = useMemo(() => {
    const categoryId = selectedSellCategoryId ?? defaultSellCategoryIdForType(watchType);
    const filtered = filterMakesForCategory(makes, categoryId);
    return filtered.map((make) => ({ value: make, label: makeDisplayLabel(make, language) }));
  }, [makes, selectedSellCategoryId, watchType, language]);
  const watchCondition = watch("condition");
  const watchTransmission = watch("transmission");
  const watchFuelType = watch("fuelType");
  const watchSeller = watch("seller");
  const watchMake = watch("make");

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: y - MIN_LISTING_YEAR + 1 }, (_, i) =>
      String(y - i),
    );
  }, []);

  const regionOptions = useMemo(
    () =>
      regions.map((r) => ({
        value: String(r.id),
        label: language === "ar" ? r.nameAr : r.nameEn,
      })),
    [regions, language],
  );

  const cityOptions = useMemo(
    () =>
      cities.map((c) => ({
        value: String(c.id),
        label: language === "ar" ? c.nameAr : c.nameEn,
      })),
    [cities, language],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRegionsLoading(true);
      const list = await fetchSaudiRegions();
      if (!cancelled) setRegions(list);
      if (!cancelled) setRegionsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const rid = regionId ? Number(regionId) : 0;
    if (!rid) {
      setCities([]);
      setCitiesLoading(false);
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    (async () => {
      const list = await fetchSaudiCities(rid);
      if (!cancelled) setCities(list);
      if (!cancelled) setCitiesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [regionId]);

  useEffect(() => {
    if (isEdit) setFlowStep("form");
  }, [isEdit]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const f = await fetchPublicFeatures();
      if (!cancelled) setListingCategoryAiEnabled(f.listingCategoryAi);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (pendingCityId == null) return;
    const found = cities.some((c) => c.id === pendingCityId);
    if (found) {
      setValue("cityId", pendingCityId);
      setPendingCityId(null);
    }
  }, [cities, pendingCityId, setValue]);

  useEffect(() => {
    if (!isEdit || !editId || !user) return;
    let cancelled = false;
    setEditListingRef(null);
    (async () => {
      try {
        const res = await fetch(`${apiBase}/trucks/${encodeURIComponent(editId)}`);
        if (!res.ok) throw new Error("load");
        const truck = (await res.json()) as Truck;
        if (cancelled) return;
        setEditListingRef(listingRefDisplay(truck));
        if (
          truck.ownerUserId != null &&
          user.id !== truck.ownerUserId
        ) {
          toast.error(t("editNotOwner"));
          navigate("/my-listings");
          return;
        }
        if (truck.cityId) {
          const cr = await fetchCityWithRegion(truck.cityId);
          if (cr) setRegionId(String(cr.regionId));
          setPendingCityId(truck.cityId);
        }
        setValue("make", truck.make);
        setValue("model", truck.model);
        setValue("year", truck.year);
        setValue("price", truck.price);
        setValue("mileage", truck.mileage);
        setValue("type", truck.type);
        setValue("condition", truck.condition);
        setValue("transmission", truck.transmission);
        setValue("fuelType", truck.fuelType);
        setValue("seller", truck.seller);
        setValue("sellerName", truck.sellerName);
        setValue("sellerPhone", truck.sellerPhone ?? "");
        setValue("description", truck.description ?? "");
        setValue(
          "features",
          Array.isArray(truck.features) ? truck.features.join(", ") : "",
        );
        setListingImageUrls(Array.isArray(truck.images) ? truck.images : []);
        setListingVideoUrl(truck.videoUrl?.trim() ? truck.videoUrl : "");
      } catch {
        toast.error(t("chatLoadFailed"));
        navigate("/my-listings");
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, editId, user, navigate, setValue, t]);

  useEffect(() => {
    let cancelled = false;
    setMakesLoading(true);
    (async () => {
      const fromDb = await fetchVehicleMakesFromDb();
      const fromMeta = await fetchMetaMakes();
      let fromFallback: string[] = [];
      try {
        fromFallback = await fallbackMakes();
      } catch {
        /* static JSON missing */
      }
      const merged = mergeSortedUnique(
        mergeSortedUnique(fromDb, fromMeta),
        fromFallback,
      );
      if (!cancelled) setMakes(merged);
      if (!cancelled) setMakesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isTrailerLikeType) return;
    setValue("model", "");
  }, [watchMake, setValue, isTrailerLikeType]);

  useEffect(() => {
    const make = watchMake?.trim();
    if (!make) {
      setModels([]);
      setModelsLoading(false);
      return;
    }
    let cancelled = false;
    setModelsLoading(true);
    (async () => {
      const fromDb = await fetchVehicleModelsFromDb(make);
      const fromMeta = await fetchMetaModelsForMake(make);
      let fromFallback: string[] = [];
      try {
        fromFallback = await fallbackModelsForMake(make);
      } catch {
        /* static JSON missing */
      }
      const merged = mergeSortedUnique(
        mergeSortedUnique(fromDb, fromMeta),
        fromFallback,
      );
      if (!cancelled) setModels(merged);
      if (!cancelled) setModelsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [watchMake]);

  useEffect(() => {
    if (flowStep !== "form") return;
    void trigger("make");
    void trigger("model");
  }, [watchType, flowStep, trigger]);

  const applyCategoryToForm = (categoryId: string) => {
    const cat = SELL_LISTING_CATEGORIES.find((c) => c.id === categoryId);
    if (cat) setValue("type", cat.type);
  };

  const handleCategoryPhotoSuggest = useCallback(
    async (file: File) => {
      setCategoryAiPending(true);
      try {
        const r = await classifyListingImage(file, getAccessToken);
        setSelectedSellCategoryId(r.sellCategoryId);
        const cat = SELL_LISTING_CATEGORIES.find((c) => c.id === r.sellCategoryId);
        const label = cat ? t(cat.labelKey) : r.sellCategoryId;
        toast.success(t("aiCategorySelectedToast").replace("{label}", label));
      } catch (e) {
        if (isAiClassificationUnavailable(e)) {
          toast.error(t("aiCategoryUnavailable"));
        } else {
          toast.error(t("aiCategoryFailed"));
        }
      } finally {
        setCategoryAiPending(false);
      }
    },
    [getAccessToken, t],
  );

  const runListingImageClassification = useCallback(
    async (file: File) => {
      if (!listingCategoryAiEnabled) return;
      setListingAiPending(true);
      setListingAiSuggestion(null);
      try {
        const r = await classifyListingImage(file, getAccessToken);
        const current =
          selectedSellCategoryId ?? defaultSellCategoryIdForType(watchType);
        if (r.sellCategoryId !== current && r.confidence >= 0.45) {
          setListingAiSuggestion(r);
        }
      } catch (e) {
        if (!isAiClassificationUnavailable(e)) {
          toast.error(t("aiCategoryFailed"));
        }
      } finally {
        setListingAiPending(false);
      }
    },
    [
      listingCategoryAiEnabled,
      getAccessToken,
      selectedSellCategoryId,
      watchType,
      t,
    ],
  );

  const applyListingAiSuggestion = () => {
    if (!listingAiSuggestion) return;
    applyCategoryToForm(listingAiSuggestion.sellCategoryId);
    setSelectedSellCategoryId(listingAiSuggestion.sellCategoryId);
    setListingAiSuggestion(null);
  };

  const handleCategoryContinue = () => {
    if (selectedSellCategoryId == null) return;
    applyCategoryToForm(selectedSellCategoryId);
    setFlowStep("form");
  };

  const handleBack = () => {
    if (isEdit) {
      navigate("/my-listings");
      return;
    }
    if (flowStep === "form") {
      setFlowStep("category");
      return;
    }
    navigate(-1);
  };

  const onSubmit = async (data: TruckFormData) => {
    const featuresArray = data.features
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const images =
      listingImageUrls.length > 0 ? listingImageUrls : [DEFAULT_LISTING_IMAGE];

    const makeTrim = (data.make ?? "").trim();
    const modelTrim = (data.model ?? "").trim();

    const trailerLike = data.type === "flatbed" || data.type === "semi";
    if (trailerLike && !makeTrim && !modelTrim) {
      toast.error(t("makeOrModelRequired"));
      return;
    }

    const payload = {
      make: makeTrim || "—",
      model: modelTrim || "—",
      year: Number(data.year),
      price: Number(data.price),
      mileage: Number(data.mileage),
      type: data.type,
      condition: data.condition,
      transmission: data.transmission,
      fuelType: data.fuelType,
      cityId: data.cityId!,
      seller: data.seller,
      sellerName: data.sellerName,
      sellerPhone: data.sellerPhone.trim(),
      description: (data.description ?? "").trim(),
      features: featuresArray,
      images,
      ...(listingVideoUrl.trim() ? { videoUrl: listingVideoUrl.trim() } : {}),
    };

    try {
      if (isEdit && editId) {
        await updateTruck(editId, payload);
        toast.success(t("listingUpdatedSuccess"));
        navigate("/my-listings");
      } else {
        await addTruck(payload);
        toast.success(t("truckAddedSuccess"));
        navigate("/inventory");
      }
    } catch {
      toast.error(t("saveFailed"));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={handleBack} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("back")}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">
              {isEdit
                ? t("editListingTitle")
                : flowStep === "category"
                  ? t("sellFlowTitle")
                  : t("listTruckTitle")}
            </CardTitle>
            <p className="text-gray-600 mt-2">
              {isEdit
                ? t("editListingDesc")
                : flowStep === "category"
                  ? t("sellFlowQuestion")
                  : t("listTruckDesc")}
            </p>
            {isEdit && editListingRef ? (
              <p className="text-sm text-muted-foreground font-mono mt-2">
                {t("listingRef")}: {editListingRef}
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            {isEdit && editLoading ? (
              <div className="flex justify-center py-16 text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin" />
              </div>
            ) : null}
            {!isEdit && flowStep === "category" ? (
              <SellListingCategoryStep
                categories={SELL_LISTING_CATEGORIES}
                selectedId={selectedSellCategoryId}
                onSelect={setSelectedSellCategoryId}
                onContinue={handleCategoryContinue}
                continueLabelKey="sellContinue"
                onSuggestFromPhoto={
                  listingCategoryAiEnabled ? handleCategoryPhotoSuggest : undefined
                }
                suggestFromPhotoPending={categoryAiPending}
              />
            ) : null}
            {((!isEdit && flowStep === "form") || (isEdit && !editLoading)) ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t("basicInformation")}</h3>
                {isTrailerLikeType ? (
                  <p className="text-sm text-muted-foreground mb-4">{t("trailerMakeModelHint")}</p>
                ) : null}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="make">
                      {t("make")}
                      {!isTrailerLikeType ? " *" : ""}
                    </Label>
                    <Controller
                      name="make"
                      control={control}
                      rules={
                        isTrailerLikeType
                          ? {}
                          : {
                              validate: (v) =>
                                (v ?? "").trim() ? true : `${t("make")} ${t("required")}`,
                            }
                      }
                      render={({ field, fieldState }) => (
                        <>
                          <InlineSearchSelect
                            id="make"
                            options={makeOptions}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder={t("selectMakePlaceholder")}
                            emptyText={t("comboboxEmptyMakes")}
                            useCustomLabel={(v) =>
                              t("useCustomValue").replace("{value}", v)
                            }
                            loading={makesLoading}
                          />
                          {fieldState.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="model">
                      {t("model")}
                      {!isTrailerLikeType ? " *" : ""}
                    </Label>
                    <Controller
                      name="model"
                      control={control}
                      rules={
                        isTrailerLikeType
                          ? {}
                          : {
                              validate: (v) =>
                                (v ?? "").trim() ? true : `${t("model")} ${t("required")}`,
                            }
                      }
                      render={({ field, fieldState }) => (
                        <>
                          <InlineSearchSelect
                            key={watchMake ?? ""}
                            id="model"
                            options={models}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder={
                              isTrailerLikeType && !watchMake?.trim()
                                ? t("selectModelTrailerPlaceholder")
                                : watchMake?.trim()
                                  ? t("selectModelPlaceholder")
                                  : t("selectMakeFirstModel")
                            }
                            emptyText={t("comboboxEmptyModels")}
                            useCustomLabel={(v) =>
                              t("useCustomValue").replace("{value}", v)
                            }
                            disabled={!isTrailerLikeType && !watchMake?.trim()}
                            loading={modelsLoading}
                          />
                          {fieldState.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="year">{t("year")} *</Label>
                    <Controller
                      name="year"
                      control={control}
                      rules={{
                        required: `${t("year")} ${t("required")}`,
                        validate: (v) => {
                          const n = typeof v === "number" ? v : Number(v);
                          if (v === "" || v === undefined || v === null || Number.isNaN(n)) {
                            return `${t("year")} ${t("required")}`;
                          }
                          if (n < MIN_LISTING_YEAR) return t("yearMin");
                          const maxY = new Date().getFullYear();
                          if (n > maxY) return t("yearMax");
                          return true;
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <InlineSearchSelect
                            id="year"
                            options={yearOptions}
                            value={
                              field.value != null && field.value !== ""
                                ? String(field.value)
                                : ""
                            }
                            onChange={(s) => {
                              const n = parseInt(s, 10);
                              field.onChange(Number.isNaN(n) ? undefined : n);
                            }}
                            onBlur={field.onBlur}
                            placeholder={t("selectYearPlaceholder")}
                            emptyText={t("comboboxEmptyYears")}
                            useCustomLabel={(v) =>
                              t("useCustomValue").replace("{value}", v)
                            }
                            allowCustom={false}
                          />
                          {fieldState.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="mileage">{t("mileage")} *</Label>
                    <Input
                      id="mileage"
                      type="number"
                      {...register("mileage", {
                        required: `${t("mileage")} ${t("required")}`,
                        min: { value: 0, message: t("mileageMin") },
                      })}
                      placeholder="e.g., 50000"
                    />
                    {errors.mileage && (
                      <p className="text-sm text-red-600 mt-1">{errors.mileage.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="price">{t("price")} *</Label>
                    <Input
                      id="price"
                      type="number"
                      {...register("price", {
                        required: `${t("price")} ${t("required")}`,
                        min: { value: 1, message: t("priceMin") },
                      })}
                      placeholder="e.g., 35000"
                    />
                    {errors.price && (
                      <p className="text-sm text-red-600 mt-1">{errors.price.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="listing-state">{t("listingState")} *</Label>
                    <InlineSearchSelect
                      id="listing-state"
                      options={regionOptions}
                      value={regionId}
                      onChange={(v) => {
                        setRegionId(v);
                        setValue("cityId", undefined, { shouldValidate: true });
                      }}
                      placeholder={t("selectStatePlaceholder")}
                      emptyText={t("comboboxEmptyRegions")}
                      useCustomLabel={(x) => t("useCustomValue").replace("{value}", x)}
                      allowCustom={false}
                      loading={regionsLoading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="listing-city">{t("listingCity")} *</Label>
                    <Controller
                      name="cityId"
                      control={control}
                      rules={{
                        validate: (v) =>
                          v != null && Number(v) > 0
                            ? true
                            : `${t("listingCity")} ${t("required")}`,
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <InlineSearchSelect
                            key={regionId || "no-region"}
                            id="listing-city"
                            options={cityOptions}
                            value={
                              field.value != null && field.value > 0
                                ? String(field.value)
                                : ""
                            }
                            onChange={(s) => {
                              const n = parseInt(s, 10);
                              field.onChange(Number.isNaN(n) ? undefined : n);
                            }}
                            onBlur={field.onBlur}
                            placeholder={
                              regionId?.trim()
                                ? t("selectCityPlaceholder")
                                : t("selectStateFirstCity")
                            }
                            emptyText={t("comboboxEmptyCities")}
                            useCustomLabel={(x) =>
                              t("useCustomValue").replace("{value}", x)
                            }
                            allowCustom={false}
                            disabled={!regionId?.trim()}
                            loading={citiesLoading}
                          />
                          {fieldState.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Truck Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t("truckDetails")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>{t("type")}</Label>
                    <div className="mt-1 flex flex-wrap items-center gap-3 rounded-md border border-input bg-muted/30 px-3 py-2">
                      <span className="text-sm font-medium capitalize">{t(watchType)}</span>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-blue-600"
                        onClick={() => setFlowStep("category")}
                      >
                        {t("changeCategory")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t("typeLockedHint")}</p>
                  </div>

                  <div>
                    <Label htmlFor="condition">{t("condition")} *</Label>
                    <Select value={watchCondition} onValueChange={(value) => setValue("condition", value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">{t("excellent")}</SelectItem>
                        <SelectItem value="good">{t("good")}</SelectItem>
                        <SelectItem value="fair">{t("fair")}</SelectItem>
                        <SelectItem value="notWorking">{t("notWorking")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="transmission">{t("transmission")} *</Label>
                    <Select value={watchTransmission} onValueChange={(value) => setValue("transmission", value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automatic">{t("automatic")}</SelectItem>
                        <SelectItem value="manual">{t("manual")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fuelType">{t("fuelType")} *</Label>
                    <Select value={watchFuelType} onValueChange={(value) => setValue("fuelType", value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diesel">{t("diesel")}</SelectItem>
                        <SelectItem value="gasoline">{t("gasoline")}</SelectItem>
                        <SelectItem value="electric">{t("electric")}</SelectItem>
                        <SelectItem value="hybrid">{t("hybrid")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seller Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t("sellerInformation")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="seller">{t("sellerType")} *</Label>
                    <Select value={watchSeller} onValueChange={(value) => setValue("seller", value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">{t("individual")}</SelectItem>
                        <SelectItem value="company">{t("company")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sellerName">
                      {watchSeller === "company" ? t("companyName") : t("yourName")} *
                    </Label>
                    <Input
                      id="sellerName"
                      {...register("sellerName", { required: `${watchSeller === "company" ? t("companyName") : t("yourName")} ${t("required")}` })}
                      placeholder={watchSeller === "company" ? "e.g., ABC Trucks Inc" : "e.g., John Doe"}
                    />
                    {errors.sellerName && (
                      <p className="text-sm text-red-600 mt-1">{errors.sellerName.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="sellerPhone">{t("sellerPhoneLabel")} *</Label>
                    <Input
                      id="sellerPhone"
                      type="tel"
                      autoComplete="tel"
                      {...register("sellerPhone", {
                        required: `${t("sellerPhoneLabel")} ${t("required")}`,
                        minLength: { value: 8, message: t("sellerPhoneLabel") },
                      })}
                      placeholder="+1 555 123 4567"
                    />
                    <p className="text-sm text-gray-500 mt-1">{t("sellerPhoneHelp")}</p>
                    {errors.sellerPhone && (
                      <p className="text-sm text-red-600 mt-1">{errors.sellerPhone.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description and Features */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t("descriptionAndFeatures")}</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="description">
                      {t("description")} ({t("optional")})
                    </Label>
                    <Textarea
                      id="description"
                      {...register("description")}
                      placeholder={t("descriptionPlaceholder")}
                      rows={5}
                    />
                  </div>

                  <div>
                    <Label htmlFor="features">{t("features")}</Label>
                    <Input
                      id="features"
                      {...register("features")}
                      placeholder={t("featuresPlaceholder")}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {t("featuresSeparate")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="listing-image">{t("imageUploadLabel")}</Label>
                    <Input
                      id="listing-image"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={
                        imageUploading || listingImageUrls.length >= MAX_LISTING_IMAGES
                      }
                      className="cursor-pointer"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        e.target.value = "";
                        if (files.length === 0) return;
                        const room = MAX_LISTING_IMAGES - listingImageUrls.length;
                        const toAdd = files.slice(0, room);
                        if (files.length > room) toast.error(t("tooManyImages"));
                        const hadNoImages = listingImageUrls.length === 0;
                        setImageUploading(true);
                        try {
                          const urls: string[] = [];
                          for (const f of toAdd) {
                            urls.push(await uploadTruckImage(f, getAccessToken));
                          }
                          setListingImageUrls((prev) => [...prev, ...urls]);
                          if (
                            listingCategoryAiEnabled &&
                            hadNoImages &&
                            toAdd.length > 0
                          ) {
                            void runListingImageClassification(toAdd[0]);
                          }
                        } catch {
                          toast.error(t("imageUploadFailed"));
                        } finally {
                          setImageUploading(false);
                        }
                      }}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {imageUploading
                        ? t("imageUploading")
                        : listingAiPending
                          ? t("aiCategoryAnalyzing")
                          : t("imageUploadHelp")}
                    </p>
                    {listingAiSuggestion ? (
                      <Alert className="mt-3 border-blue-200 bg-blue-50/80">
                        <AlertTitle>{t("aiCategorySuggestionTitle")}</AlertTitle>
                        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <p className="text-muted-foreground">
                            {t("aiCategorySuggestionBody")
                              .replace(
                                "{label}",
                                t(
                                  SELL_LISTING_CATEGORIES.find(
                                    (c) => c.id === listingAiSuggestion.sellCategoryId,
                                  )?.labelKey ?? "",
                                ),
                              )
                              .replace(
                                "{percent}",
                                String(Math.round(listingAiSuggestion.confidence * 100)),
                              )}
                          </p>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button type="button" size="sm" onClick={applyListingAiSuggestion}>
                              {t("aiCategoryApplySuggestion")}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setListingAiSuggestion(null)}
                            >
                              {t("aiCategoryKeepChoice")}
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    {listingImageUrls.length > 0 ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                        {listingImageUrls.map((url, idx) => (
                          <div key={`${url}-${idx}`} className="relative">
                            <img
                              src={url}
                              alt=""
                              className="h-24 w-full rounded-md border object-cover"
                            />
                            <button
                              type="button"
                              className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-black/80"
                              onClick={() =>
                                setListingImageUrls((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                )
                              }
                              aria-label="Remove"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <Label htmlFor="listing-video">{t("videoUploadLabel")}</Label>
                    <Input
                      id="listing-video"
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      disabled={videoUploading}
                      className="cursor-pointer"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        setVideoUploading(true);
                        try {
                          const url = await uploadTruckVideo(f, getAccessToken);
                          setListingVideoUrl(url);
                        } catch {
                          toast.error(t("videoUploadFailed"));
                        } finally {
                          setVideoUploading(false);
                        }
                      }}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {videoUploading ? t("videoUploading") : t("videoUploadHelp")}
                    </p>
                    {listingVideoUrl ? (
                      <div className="mt-3 space-y-2">
                        <video
                          src={listingVideoUrl}
                          controls
                          className="max-h-48 w-full rounded-md border bg-black"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setListingVideoUrl("")}
                        >
                          {t("removeVideo")}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1">
                  {isEdit ? t("saveListing") : t("listTruck")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => (isEdit ? navigate("/my-listings") : navigate(-1))}
                >
                  {t("cancel")}
                </Button>
              </div>
            </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}