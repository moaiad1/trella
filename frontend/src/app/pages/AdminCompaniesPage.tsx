import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getApiBase } from "../lib/apiBase";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

const apiBase = getApiBase();

type CompanyStatus = "pending" | "approved" | "rejected";

interface AdminCompany {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  crNumber: string;
  hasVat: boolean;
  vatNumber: string;
  crDocumentUrl: string;
  logoUrl: string;
  repName: string;
  repPhone: string;
  extraPhones: string[];
  companyStatus: CompanyStatus;
  createdAt: string;
}

async function parseApiError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { detail?: string | unknown };
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail)) return JSON.stringify(j.detail);
  } catch {
    /* ignore */
  }
  return text || res.statusText;
}

function statusBadgeClass(status: CompanyStatus): string {
  if (status === "approved") return "border-green-300 bg-green-50 text-green-700";
  if (status === "rejected") return "border-red-300 bg-red-50 text-red-700";
  return "border-amber-300 bg-amber-50 text-amber-700";
}

export function AdminCompaniesPage() {
  const { getAccessToken } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<CompanyStatus | "all">("pending");
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(
    async (status: CompanyStatus | "all") => {
      const token = getAccessToken();
      if (!token) return;
      setLoading(true);
      try {
        const qs = status === "all" ? "" : `?status=${status}`;
        const res = await fetch(`${apiBase}/admin/companies${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await parseApiError(res));
        const data = (await res.json()) as AdminCompany[];
        setCompanies(Array.isArray(data) ? data : []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("adminLoadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken, t],
  );

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  const setStatus = async (id: number, status: CompanyStatus) => {
    const token = getAccessToken();
    if (!token) return;
    setBusyId(id);
    try {
      const res = await fetch(`${apiBase}/admin/companies/${id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ companyStatus: status }),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      toast.success(t("adminStatusUpdated"));
      await load(tab);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("adminStatusUpdateFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("adminCompaniesTitle")}</h1>
        <p className="text-gray-600 mb-6">{t("adminCompaniesSubtitle")}</p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as CompanyStatus | "all")} className="mb-6">
          <TabsList>
            <TabsTrigger value="pending">{t("companyStatusPending")}</TabsTrigger>
            <TabsTrigger value="approved">{t("companyStatusApproved")}</TabsTrigger>
            <TabsTrigger value="rejected">{t("companyStatusRejected")}</TabsTrigger>
            <TabsTrigger value="all">{t("adminAllCompanies")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-16 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">{t("adminNoCompanies")}</p>
        ) : (
          <ul className="space-y-4">
            {companies.map((c) => (
              <li key={c.id} className="border border-gray-200 rounded-lg p-4 bg-white space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{c.companyName || "—"}</h3>
                      <Badge variant="outline" className={statusBadgeClass(c.companyStatus)}>
                        {t(
                          c.companyStatus === "approved"
                            ? "companyStatusApproved"
                            : c.companyStatus === "rejected"
                              ? "companyStatusRejected"
                              : "companyStatusPending",
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {c.firstName} {c.lastName} — {c.email}
                    </p>
                  </div>
                  <time className="text-xs text-gray-500">
                    {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                  </time>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">{t("crNumberLabel")}: </span>
                    <span dir="ltr">{c.crNumber || "—"}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t("mobileNumber")}: </span>
                    <span dir="ltr">{c.phone || "—"}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t("hasVatLabel")}: </span>
                    {c.hasVat ? t("yes") : t("no")}
                    {c.hasVat && c.vatNumber ? ` (${c.vatNumber})` : ""}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t("representativeNameLabel")}: </span>
                    {c.repName || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t("representativePhoneLabel")}: </span>
                    <span dir="ltr">{c.repPhone || "—"}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t("additionalPhonesLabel")}: </span>
                    <span dir="ltr">{c.extraPhones.length ? c.extraPhones.join(", ") : "—"}</span>
                  </p>
                </div>

                {c.crDocumentUrl ? (
                  <a
                    href={c.crDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-sm text-blue-600 hover:underline"
                  >
                    {t("viewCrDocument")}
                  </a>
                ) : (
                  <p className="text-sm text-red-600">{t("noCrDocument")}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === c.id || c.companyStatus === "approved"}
                    onClick={() => void setStatus(c.id, "approved")}
                  >
                    {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("adminApprove")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === c.id || c.companyStatus === "rejected"}
                    onClick={() => void setStatus(c.id, "rejected")}
                  >
                    {t("adminReject")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
