import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";

export function LoginPage() {
  const { login, verifyTwoFactor } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"credentials" | "twoFactor">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/add-truck";

  const finishLogin = () => {
    toast.success(t("loginSuccess"));
    navigate(redirectTo.startsWith("/") ? redirectTo : "/add-truck", { replace: true });
  };

  const onSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.requiresTwoFactor) {
        setChallengeToken(result.challengeToken);
        setStep("twoFactor");
        if (result.debugCode) {
          toast.info(`${t("devCodeHint")} ${result.debugCode}`);
        }
        return;
      }
      finishLogin();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("loginFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await verifyTwoFactor(challengeToken, code);
      finishLogin();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("loginFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        {step === "credentials" ? (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
              <CardDescription>{t("loginSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmitCredentials} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">{t("email")}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">{t("password")}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "…" : t("loginAction")}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-gray-600">
                {t("noAccount")}{" "}
                <Link
                  to={`/signup?redirect=${encodeURIComponent(redirectTo)}`}
                  className="text-blue-600 font-medium hover:underline"
                >
                  {t("signUp")}
                </Link>
              </p>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">{t("twoFactorTitle")}</CardTitle>
              <CardDescription>{t("twoFactorSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmitTwoFactor} className="space-y-4">
                <div>
                  <Label htmlFor="login-2fa-code">{t("verificationCodeLabel")}</Label>
                  <Input
                    id="login-2fa-code"
                    type="text"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    minLength={4}
                    className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "…" : t("confirmTwoFactor")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("credentials");
                    setCode("");
                  }}
                >
                  {t("back")}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
