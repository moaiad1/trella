import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "react-router";
import { useTrucks } from "../context/TruckContext";
import { useLanguage } from "../context/LanguageContext";
import { TruckCard } from "../components/TruckCard";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { Slider } from "../components/ui/slider";
import { CATEGORY_TYPES } from "../lib/categoryInventory";
import { SarAmount } from "../components/SarAmount";
import { fetchSaudiRegions, type SaudiRegion } from "../lib/saudiLocationsApi";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

export function InventoryPage() {
  const { trucks, loading, error } = useTrucks();
  const { t, language } = useLanguage();
  useDocumentMeta(t("seoInventoryTitle"), t("seoInventoryDescription"), "/inventory");
  const [searchParams, setSearchParams] = useSearchParams();
  const skipUrlSync = useRef(false);

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") ?? "");
  const [sortBy, setSortBy] = useState("dateAdded-desc");

  // Filters
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedMakes, setSelectedMakes] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [regions, setRegions] = useState<SaudiRegion[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>([]);
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 150000]);
  const [yearRange, setYearRange] = useState([2015, 2024]);
  const [mileageRange, setMileageRange] = useState([0, 200000]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchSaudiRegions();
      if (!cancelled) setRegions(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (skipUrlSync.current) {
      skipUrlSync.current = false;
      return;
    }
    const c = searchParams.get("cat");
    if (!c) {
      setSelectedTypes([]);
    } else {
      const types = CATEGORY_TYPES[c];
      setSelectedTypes(types ? [...types] : []);
    }
  }, [searchParams]);

  const makesInInventory = useMemo(
    () =>
      [...new Set(trucks.map((x) => x.make))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      ),
    [trucks],
  );

  // Filter and sort trucks
  const filteredTrucks = trucks.filter((truck) => {
    // Search query
    const matchesSearch = searchQuery === "" || 
      truck.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      truck.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      truck.location.toLowerCase().includes(searchQuery.toLowerCase());

    // Type filter
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(truck.type);

    // Make filter
    const matchesMake =
      selectedMakes.length === 0 || selectedMakes.includes(truck.make);

    // Region filter
    const matchesRegion =
      selectedRegions.length === 0 || selectedRegions.some((r) => truck.location.includes(r));

    // Condition filter
    const matchesCondition = selectedConditions.length === 0 || selectedConditions.includes(truck.condition);

    // Transmission filter
    const matchesTransmission = selectedTransmissions.length === 0 || selectedTransmissions.includes(truck.transmission);

    // Fuel type filter
    const matchesFuelType = selectedFuelTypes.length === 0 || selectedFuelTypes.includes(truck.fuelType);

    // Seller filter
    const matchesSeller = selectedSellers.length === 0 || selectedSellers.includes(truck.seller);

    // Price range
    const matchesPrice = truck.price >= priceRange[0] && truck.price <= priceRange[1];

    // Year range
    const matchesYear = truck.year >= yearRange[0] && truck.year <= yearRange[1];

    // Mileage range
    const matchesMileage = truck.mileage >= mileageRange[0] && truck.mileage <= mileageRange[1];

    return matchesSearch && matchesType && matchesMake && matchesRegion && matchesCondition && matchesTransmission &&
           matchesFuelType && matchesSeller && matchesPrice && matchesYear && matchesMileage;
  });

  // Sort trucks
  const sortedTrucks = [...filteredTrucks].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "year-asc":
        return a.year - b.year;
      case "year-desc":
        return b.year - a.year;
      case "mileage-asc":
        return a.mileage - b.mileage;
      case "mileage-desc":
        return b.mileage - a.mileage;
      case "dateAdded-desc":
      default:
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    }
  });

  const handleTypeToggle = (type: string) => {
    skipUrlSync.current = true;
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type],
    );
    setSearchParams({}, { replace: true });
  };

  const handleMakeToggle = (make: string) => {
    setSelectedMakes((prev) =>
      prev.includes(make) ? prev.filter((m) => m !== make) : [...prev, make],
    );
  };

  const handleRegionToggle = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region],
    );
  };

  const handleConditionToggle = (condition: string) => {
    setSelectedConditions(prev =>
      prev.includes(condition) ? prev.filter(c => c !== condition) : [...prev, condition]
    );
  };

  const handleTransmissionToggle = (transmission: string) => {
    setSelectedTransmissions(prev =>
      prev.includes(transmission) ? prev.filter(t => t !== transmission) : [...prev, transmission]
    );
  };

  const handleFuelTypeToggle = (fuelType: string) => {
    setSelectedFuelTypes(prev =>
      prev.includes(fuelType) ? prev.filter(f => f !== fuelType) : [...prev, fuelType]
    );
  };

  const handleSellerToggle = (seller: string) => {
    setSelectedSellers(prev =>
      prev.includes(seller) ? prev.filter(s => s !== seller) : [...prev, seller]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedMakes([]);
    setSelectedRegions([]);
    setSelectedConditions([]);
    setSelectedTransmissions([]);
    setSelectedFuelTypes([]);
    setSelectedSellers([]);
    setPriceRange([0, 150000]);
    setYearRange([2015, 2024]);
    setMileageRange([0, 200000]);
    setSearchQuery("");
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedMakes.length > 0 || selectedRegions.length > 0 ||
    selectedConditions.length > 0 ||
    selectedTransmissions.length > 0 || selectedFuelTypes.length > 0 ||
    selectedSellers.length > 0 || priceRange[0] > 0 || priceRange[1] < 150000 ||
    yearRange[0] > 2015 || yearRange[1] < 2024 || mileageRange[0] > 0 || mileageRange[1] < 200000;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Type Filter */}
      <div>
        <Label className="text-base font-semibold mb-3 block">{t("truckType")}</Label>
        <div className="space-y-2">
          {["commercial", "pickup", "van", "dump", "flatbed", "semi"].map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${type}`}
                checked={selectedTypes.includes(type)}
                onCheckedChange={() => handleTypeToggle(type)}
              />
              <label htmlFor={`type-${type}`} className="text-sm capitalize cursor-pointer">
                {t(type)}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Make filter */}
      {makesInInventory.length > 0 ? (
        <div>
          <Label className="text-base font-semibold mb-3 block">{t("make")}</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {makesInInventory.map((make, idx) => (
              <div key={make} className="flex items-center space-x-2">
                <Checkbox
                  id={`inv-make-${idx}`}
                  checked={selectedMakes.includes(make)}
                  onCheckedChange={() => handleMakeToggle(make)}
                />
                <label htmlFor={`inv-make-${idx}`} className="text-sm cursor-pointer">
                  {make}
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Region filter */}
      {regions.length > 0 ? (
        <div>
          <Label className="text-base font-semibold mb-3 block">{t("listingState")}</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {regions.map((region) => (
              <div key={region.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`inv-region-${region.id}`}
                  checked={selectedRegions.includes(region.nameEn)}
                  onCheckedChange={() => handleRegionToggle(region.nameEn)}
                />
                <label htmlFor={`inv-region-${region.id}`} className="text-sm cursor-pointer">
                  {language === "ar" ? region.nameAr : region.nameEn}
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Condition Filter */}
      <div>
        <Label className="text-base font-semibold mb-3 block">{t("condition")}</Label>
        <div className="space-y-2">
          {["excellent", "good", "fair", "notWorking"].map((condition) => (
            <div key={condition} className="flex items-center space-x-2">
              <Checkbox
                id={`condition-${condition}`}
                checked={selectedConditions.includes(condition)}
                onCheckedChange={() => handleConditionToggle(condition)}
              />
              <label htmlFor={`condition-${condition}`} className="text-sm capitalize cursor-pointer">
                {t(condition)}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <Label className="text-base font-semibold mb-3 block">
          {t("priceRange")}: <SarAmount price={priceRange[0]} language={language} /> –{" "}
          <SarAmount price={priceRange[1]} language={language} />
        </Label>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={150000}
          step={5000}
          className="mt-2"
        />
      </div>

      {/* Year Range */}
      <div>
        <Label className="text-base font-semibold mb-3 block">
          {t("yearRange")}: {yearRange[0]} - {yearRange[1]}
        </Label>
        <Slider
          value={yearRange}
          onValueChange={setYearRange}
          min={2015}
          max={2024}
          step={1}
          className="mt-2"
        />
      </div>

      {/* Mileage Range */}
      <div>
        <Label className="text-base font-semibold mb-3 block">
          {t("mileageRange")}: {mileageRange[0].toLocaleString()} - {mileageRange[1].toLocaleString()} {t("miles")}
        </Label>
        <Slider
          value={mileageRange}
          onValueChange={setMileageRange}
          max={200000}
          step={10000}
          className="mt-2"
        />
      </div>

      {/* Transmission Filter */}
      <div>
        <Label className="text-base font-semibold mb-3 block">{t("transmission")}</Label>
        <div className="space-y-2">
          {["automatic", "manual"].map((transmission) => (
            <div key={transmission} className="flex items-center space-x-2">
              <Checkbox
                id={`transmission-${transmission}`}
                checked={selectedTransmissions.includes(transmission)}
                onCheckedChange={() => handleTransmissionToggle(transmission)}
              />
              <label htmlFor={`transmission-${transmission}`} className="text-sm capitalize cursor-pointer">
                {t(transmission)}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Fuel Type Filter */}
      <div>
        <Label className="text-base font-semibold mb-3 block">{t("fuelType")}</Label>
        <div className="space-y-2">
          {["diesel", "gasoline", "electric", "hybrid"].map((fuelType) => (
            <div key={fuelType} className="flex items-center space-x-2">
              <Checkbox
                id={`fuel-${fuelType}`}
                checked={selectedFuelTypes.includes(fuelType)}
                onCheckedChange={() => handleFuelTypeToggle(fuelType)}
              />
              <label htmlFor={`fuel-${fuelType}`} className="text-sm capitalize cursor-pointer">
                {t(fuelType)}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Seller Type Filter */}
      <div>
        <Label className="text-base font-semibold mb-3 block">{t("sellerType")}</Label>
        <div className="space-y-2">
          {["individual", "company"].map((seller) => (
            <div key={seller} className="flex items-center space-x-2">
              <Checkbox
                id={`seller-${seller}`}
                checked={selectedSellers.includes(seller)}
                onCheckedChange={() => handleSellerToggle(seller)}
              />
              <label htmlFor={`seller-${seller}`} className="text-sm capitalize cursor-pointer">
                {t(seller)}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{t("browseInventoryTitle")}</h1>
          
          {/* Search and Sort */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t("sortBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dateAdded-desc">{t("newestFirst")}</SelectItem>
                <SelectItem value="price-asc">{t("priceLowToHigh")}</SelectItem>
                <SelectItem value="price-desc">{t("priceHighToLow")}</SelectItem>
                <SelectItem value="year-desc">{t("yearNewest")}</SelectItem>
                <SelectItem value="year-asc">{t("yearOldest")}</SelectItem>
                <SelectItem value="mileage-asc">{t("mileageLowToHigh")}</SelectItem>
                <SelectItem value="mileage-desc">{t("mileageHighToLow")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-6 sticky top-24">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-lg">{t("filters")}</h2>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-1" />
                    {t("clear")}
                  </Button>
                )}
              </div>
              <FilterContent />
            </div>
          </aside>

          {/* Mobile Filters */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  {t("filters")} {hasActiveFilters && `(${
                    selectedTypes.length + selectedMakes.length + selectedRegions.length +
                    selectedConditions.length +
                    selectedTransmissions.length + selectedFuelTypes.length +
                    selectedSellers.length
                  })`}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{t("filters")}</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                  {hasActiveFilters && (
                    <Button variant="outline" className="w-full mt-6" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-2" />
                      {t("clearAllFilters")}
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Truck Grid */}
          <div className="flex-1">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                {t("loadFailed")}
              </div>
            )}
            {!loading && !error && (
              <div className="mb-4 text-sm text-gray-600">
                {t("showingResults")} {sortedTrucks.length} {t("of")} {trucks.length}{" "}
                {t("trucks")}
              </div>
            )}

            {loading && !error && (
              <p className="text-center text-gray-600 py-12">{t("loading")}</p>
            )}

            {!loading && !error && sortedTrucks.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500 text-lg">{t("noTrucksFound")}</p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  {t("clearAllFilters")}
                </Button>
              </div>
            ) : null}
            {!loading && !error && sortedTrucks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedTrucks.map((truck) => (
                  <TruckCard key={truck.id} truck={truck} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
