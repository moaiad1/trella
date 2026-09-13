import { Link } from "react-router";
import { Search, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { Button } from "../components/ui/button";
import { useTrucks } from "../context/TruckContext";
import { useLanguage } from "../context/LanguageContext";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { TruckCard } from "../components/TruckCard";

export function HomePage() {
  const { trucks, loading, error } = useTrucks();
  const { t } = useLanguage();
  useDocumentMeta(t("seoHomeTitle"), t("seoHomeDescription"), "/");
  const featuredTrucks = trucks.slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] overflow-hidden bg-blue-950">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-blue-950 via-blue-950/85 to-blue-950/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {t("heroTitle")}
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              {t("heroSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-white text-blue-900 hover:bg-gray-100">
                <Link to="/inventory">{t("browseInventory")}</Link>
              </Button>
              <Button asChild size="lg" className="bg-white text-blue-900 hover:bg-gray-100">
                <Link to="/add-truck">{t("listYourTruck")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Search className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("advancedSearch")}</h3>
              <p className="text-gray-600">
                {t("advancedSearchDesc")}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <ShieldCheck className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("trustedSellers")}</h3>
              <p className="text-gray-600">
                {t("trustedSellersDesc")}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("bestPrices")}</h3>
              <p className="text-gray-600">
                {t("bestPricesDesc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Trucks */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">{t("featuredTrucks")}</h2>
            <Button asChild variant="outline">
              <Link to="/inventory">{t("viewAll")}</Link>
            </Button>
          </div>
          {error && (
            <p className="text-center text-red-600 col-span-full mb-4">{t("loadFailed")}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading && !error && (
              <p className="text-gray-600 col-span-full text-center py-8">{t("loading")}</p>
            )}
            {!loading &&
              !error &&
              featuredTrucks.map((truck) => <TruckCard key={truck.id} truck={truck} />)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Users className="w-16 h-16 text-white mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">
            {t("readyToSell")}
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t("readyToSellDesc")}
          </p>
          <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
            <Link to="/add-truck">{t("getStarted")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}