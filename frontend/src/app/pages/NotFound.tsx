import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { useLanguage } from "../context/LanguageContext";

export function NotFound() {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">{t("pageNotFound")}</h2>
        <p className="text-gray-600 mb-8">
          {t("pageNotFoundDesc")}
        </p>
        <Button asChild>
          <Link to="/">{t("goBackHome")}</Link>
        </Button>
      </div>
    </div>
  );
}