import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getApiBase } from "../lib/apiBase";
import { uploadTruckImage } from "../lib/uploadTruckImage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";

const apiBase = getApiBase();
const MAX_EXTRA_PHONES = 10;

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

export function CompanyProfileSection() {
  const { user, getAccessToken, refreshUser } = useAuth();
  const { t } = useLanguage();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const crDocInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState(user?.logoUrl ?? "");
  const [crDocumentUrl, setCrDocumentUrl] = useState(user?.crDocumentUrl ?? "");
  const [extraPhones, setExtraPhones] = useState<string[]>(user?.extraPhones ?? []);
  const [repName, setRepName] = useState(user?.repName ?? "");
  const [repPhone, setRepPhone] = useState(user?.repPhone ?? "");
  const [logoUploading, setLogoUploading] = useState(false);
  const [crDocUploading, setCrDocUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user || user.accountType !== "company") return null;

  const onLogoPick = async (file: File) => {
    setLogoUploading(true);
    try {
      const url = await uploadTruckImage(file, getAccessToken);
      setLogoUrl(url);
    } catch {
      toast.error(t("logoUploadFailed"));
    } finally {
      setLogoUploading(false);
    }
  };

  const onCrDocumentPick = async (file: File) => {
    setCrDocUploading(true);
    try {
      const url = await uploadTruckImage(file, getAccessToken);
      setCrDocumentUrl(url);
    } catch {
      toast.error(t("crDocumentUploadFailed"));
    } finally {
      setCrDocUploading(false);
    }
  };

  const addPhoneField = () => {
    if (extraPhones.length >= MAX_EXTRA_PHONES) return;
    setExtraPhones((prev) => [...prev, ""]);
  };

  const updatePhoneField = (i: number, value: string) => {
    setExtraPhones((prev) => prev.map((p, idx) => (idx === i ? value : p)));
  };

  const removePhoneField = (i: number) => {
    setExtraPhones((prev) => prev.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/auth/company-profile`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl,
          crDocumentUrl,
          extraPhones: extraPhones.map((p) => p.trim()).filter(Boolean),
          repName: repName.trim(),
          repPhone: repPhone.trim(),
        }),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      await refreshUser();
      toast.success(t("companyProfileUpdated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("companyProfileUpdateFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">{t("companyProfileTitle")}</h3>
          <Badge
            variant="outline"
            className={
              user.companyStatus === "approved"
                ? "border-green-300 bg-green-50 text-green-700"
                : user.companyStatus === "rejected"
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-amber-300 bg-amber-50 text-amber-700"
            }
          >
            {t(
              user.companyStatus === "approved"
                ? "companyStatusApproved"
                : user.companyStatus === "rejected"
                  ? "companyStatusRejected"
                  : "companyStatusPending",
            )}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t("companyProfileDesc")}</p>
        {user.companyStatus !== "approved" ? (
          <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {user.companyStatus === "rejected" ? t("companyStatusRejectedHelp") : t("companyStatusPendingHelp")}
          </p>
        ) : null}
      </div>

      <div className="space-y-1 text-sm text-gray-800 rounded-md border border-gray-200 bg-gray-50/60 p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">{t("registeredCompanyInfo")}</p>
        <p>
          <span className="text-muted-foreground">{t("companyName")}: </span>
          <span className="font-medium">{user.companyName || "—"}</span>
        </p>
        <p>
          <span className="text-muted-foreground">{t("crNumberLabel")}: </span>
          <span className="font-medium" dir="ltr">{user.crNumber || "—"}</span>
        </p>
        <p>
          <span className="text-muted-foreground">{t("hasVatLabel")}: </span>
          <span className="font-medium">{user.hasVat ? t("yes") : t("no")}</span>
        </p>
        {user.hasVat ? (
          <p>
            <span className="text-muted-foreground">{t("vatNumberLabel")}: </span>
            <span className="font-medium" dir="ltr">{user.vatNumber || "—"}</span>
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>{t("crDocumentLabel")}</Label>
        <div className="flex flex-wrap items-center gap-3">
          {crDocumentUrl ? (
            <a
              href={crDocumentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {t("viewCrDocument")}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">{t("noCrDocument")}</span>
          )}
          <input
            ref={crDocInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) await onCrDocumentPick(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={crDocUploading}
            onClick={() => crDocInputRef.current?.click()}
          >
            {crDocUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : crDocumentUrl ? (
              t("replaceCrDocument")
            ) : (
              t("uploadCrDocument")
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("companyLogoLabel")}</Label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">{t("companyLogoLabel")}</span>
            )}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) await onLogoPick(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={logoUploading}
            onClick={() => logoInputRef.current?.click()}
          >
            {logoUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : logoUrl ? (
              t("changeLogo")
            ) : (
              t("uploadLogo")
            )}
          </Button>
          {logoUrl ? (
            <Button type="button" variant="ghost" onClick={() => setLogoUrl("")}>
              {t("removeLogo")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("additionalPhonesLabel")}</Label>
        <p className="text-xs text-muted-foreground">{t("additionalPhonesHelp")}</p>
        <div className="space-y-2">
          {extraPhones.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                dir="ltr"
                value={p}
                onChange={(e) => updatePhoneField(i, e.target.value)}
                placeholder="+966 5xxxxxxxx"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("removeNumber")}
                onClick={() => removePhoneField(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        {extraPhones.length < MAX_EXTRA_PHONES ? (
          <Button type="button" variant="outline" size="sm" onClick={addPhoneField}>
            {t("addPhoneNumber")}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rep-name">{t("representativeNameLabel")}</Label>
          <Input id="rep-name" value={repName} onChange={(e) => setRepName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rep-phone">{t("representativePhoneLabel")}</Label>
          <Input
            id="rep-phone"
            dir="ltr"
            value={repPhone}
            onChange={(e) => setRepPhone(e.target.value)}
            placeholder="+966 5xxxxxxxx"
          />
        </div>
      </div>

      <Button type="button" onClick={() => void save()} disabled={saving || logoUploading || crDocUploading}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("saveCompanyProfile")}
      </Button>
    </div>
  );
}
