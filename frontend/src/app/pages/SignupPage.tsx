import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { toast } from "sonner";
import { getApiBase } from "../lib/apiBase";
import { uploadTruckImage } from "../lib/uploadTruckImage";

const apiBase = getApiBase();

const CR_NUMBER_RE = /^\d{10}$/;
const VAT_NUMBER_RE = /^3\d{13}3$/;

export function SignupPage() {
  const { register, verifySignup, resendSignupCode, getAccessToken, refreshUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"type" | "details">("type");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accountType, setAccountType] = useState<"individual" | "company">("individual");
  const [companyName, setCompanyName] = useState("");
  const [crNumber, setCrNumber] = useState("");
  const [hasVat, setHasVat] = useState(false);
  const [vatNumber, setVatNumber] = useState("");
  const [crDocumentFile, setCrDocumentFile] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/add-truck";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t("passwordMismatch"));
      return;
    }
    if (!termsAccepted) {
      toast.error(t("termsRequired"));
      return;
    }
    if (accountType === "company") {
      if (!companyName.trim()) {
        toast.error(t("companyNameRequired"));
        return;
      }
      if (!CR_NUMBER_RE.test(crNumber.trim())) {
        toast.error(t("crNumberInvalid"));
        return;
      }
      if (hasVat && !VAT_NUMBER_RE.test(vatNumber.trim())) {
        toast.error(t("vatNumberInvalid"));
        return;
      }
      if (!crDocumentFile) {
        toast.error(t("crDocumentRequired"));
        return;
      }
    }
    setSubmitting(true);
    try {
      const result = await register({
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        accountType,
        companyName: accountType === "company" ? companyName.trim() : "",
        crNumber: accountType === "company" ? crNumber.trim() : "",
        hasVat: accountType === "company" ? hasVat : false,
        vatNumber: accountType === "company" && hasVat ? vatNumber.trim() : "",
        termsAccepted: true,
      });
      setChallengeToken(result.challengeToken);
      setCooldownRemaining(result.cooldownSeconds);
      setVerifyCode("");
      setVerifyOpen(true);
      if (result.debugCode) {
        toast.info(`${t("devCodeHint")} ${result.debugCode}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("signupFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!verifyOpen || cooldownRemaining <= 0) return;
    const id = setInterval(() => setCooldownRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [verifyOpen, cooldownRemaining > 0]);

  const onVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      await verifySignup(challengeToken, verifyCode);
      if (accountType === "company" && crDocumentFile) {
        try {
          const url = await uploadTruckImage(crDocumentFile, getAccessToken);
          const token = getAccessToken();
          await fetch(`${apiBase}/auth/company-profile`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              crDocumentUrl: url,
              logoUrl: "",
              extraPhones: [],
              repName: "",
              repPhone: "",
            }),
          });
          await refreshUser();
        } catch {
          toast.error(t("crDocumentUploadFailedAfterSignup"));
        }
      }
      setVerifyOpen(false);
      toast.success(t("signupSuccess"));
      navigate(redirectTo.startsWith("/") ? redirectTo : "/add-truck", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("signupVerifyFailed"));
    } finally {
      setVerifying(false);
    }
  };

  const onResendCode = async () => {
    setResending(true);
    try {
      const result = await resendSignupCode(challengeToken);
      setCooldownRemaining(result.cooldownSeconds);
      if (result.debugCode) {
        toast.info(`${t("devCodeHint")} ${result.debugCode}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("signupVerifyFailed"));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t("signupTitle")}</CardTitle>
          <CardDescription>{t("signupSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "type" ? (
            <div className="space-y-6">
              <div>
                <Label>{t("accountTypeQuestion")}</Label>
                <RadioGroup
                  value={accountType}
                  onValueChange={(value) => setAccountType(value as "individual" | "company")}
                  className="mt-2 grid grid-cols-2 gap-3"
                >
                  <Label
                    htmlFor="account-type-individual"
                    className="flex items-center gap-2 rounded-md border p-3 cursor-pointer has-[[data-state=checked]]:border-blue-600 has-[[data-state=checked]]:bg-blue-50"
                  >
                    <RadioGroupItem value="individual" id="account-type-individual" />
                    {t("accountTypeIndividual")}
                  </Label>
                  <Label
                    htmlFor="account-type-company"
                    className="flex items-center gap-2 rounded-md border p-3 cursor-pointer has-[[data-state=checked]]:border-blue-600 has-[[data-state=checked]]:bg-blue-50"
                  >
                    <RadioGroupItem value="company" id="account-type-company" />
                    {t("accountTypeCompany")}
                  </Label>
                </RadioGroup>
              </div>
              <Button type="button" className="w-full" onClick={() => setStep("details")}>
                {t("accountTypeContinue")}
              </Button>
              <p className="text-center text-sm text-gray-600">
                {t("haveAccount")}{" "}
                <Link
                  to={`/login?redirect=${encodeURIComponent(redirectTo)}`}
                  className="text-blue-600 font-medium hover:underline"
                >
                  {t("logIn")}
                </Link>
              </p>
            </div>
          ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-blue-600"
              onClick={() => setStep("type")}
            >
              {t("changeAccountType")}
            </Button>
            {accountType === "company" && (
              <div className="space-y-4 rounded-md border p-3">
                <div>
                  <Label htmlFor="signup-company-name">{t("companyName")}</Label>
                  <Input
                    id="signup-company-name"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="signup-cr-number">{t("crNumberLabel")}</Label>
                  <Input
                    id="signup-cr-number"
                    type="text"
                    inputMode="numeric"
                    value={crNumber}
                    onChange={(e) => setCrNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder={t("crNumberPlaceholder")}
                    required
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="signup-has-vat"
                    checked={hasVat}
                    onCheckedChange={(checked) => setHasVat(checked === true)}
                  />
                  <Label htmlFor="signup-has-vat" className="cursor-pointer">
                    {t("hasVatLabel")}
                  </Label>
                </div>
                {hasVat && (
                  <div>
                    <Label htmlFor="signup-vat-number">{t("vatNumberLabel")}</Label>
                    <Input
                      id="signup-vat-number"
                      type="text"
                      inputMode="numeric"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value.replace(/\D/g, "").slice(0, 15))}
                      placeholder={t("vatNumberPlaceholder")}
                      required
                      className="mt-1"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="signup-cr-document">{t("crDocumentLabel")}</Label>
                  <Input
                    id="signup-cr-document"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => setCrDocumentFile(e.target.files?.[0] ?? null)}
                    required
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t("crDocumentHelp")}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <Label htmlFor="signup-first">{t("firstName")}</Label>
                <Input
                  id="signup-first"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  minLength={1}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="signup-last">{t("lastName")}</Label>
                <Input
                  id="signup-last"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  minLength={1}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="signup-phone">{t("mobileNumber")}</Label>
              <Input
                id="signup-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                minLength={8}
                maxLength={32}
                className="mt-1"
                placeholder="+966 5xxxxxxxx"
              />
            </div>
            <div>
              <Label htmlFor="signup-email">{t("email")}</Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="signup-password">{t("password")}</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="signup-confirm">{t("confirmPassword")}</Label>
              <Input
                id="signup-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="mt-1"
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="signup-terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="signup-terms" className="cursor-pointer font-normal">
                {t("agreeToTermsPrefix")}{" "}
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => setTermsOpen(true)}
                >
                  {t("termsAndConditionsLink")}
                </button>
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "…" : t("signupAction")}
            </Button>
          </form>
          )}
          {step === "details" && (
            <p className="mt-6 text-center text-sm text-gray-600">
              {t("haveAccount")}{" "}
              <Link
                to={`/login?redirect=${encodeURIComponent(redirectTo)}`}
                className="text-blue-600 font-medium hover:underline"
              >
                {t("logIn")}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("termsAndConditionsLink")}</DialogTitle>
            <DialogDescription className="sr-only">{t("termsAndConditionsLink")}</DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-line text-sm text-gray-700">{t("termsContent")}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={verifyOpen} onOpenChange={(open) => !verifying && setVerifyOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("signupVerifyTitle")}</DialogTitle>
            <DialogDescription>{t("signupVerifySubtitle")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onVerifySubmit} className="space-y-4">
            <div>
              <Label htmlFor="signup-verify-code">{t("verificationCodeLabel")}</Label>
              <Input
                id="signup-verify-code"
                type="text"
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                required
                minLength={4}
                className="mt-1"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={verifying}>
              {verifying ? "…" : t("confirmSignupCode")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={resending || cooldownRemaining > 0}
              onClick={onResendCode}
            >
              {resending
                ? "…"
                : cooldownRemaining > 0
                  ? `${t("resendCodeIn")} ${cooldownRemaining}s`
                  : t("resendCode")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
