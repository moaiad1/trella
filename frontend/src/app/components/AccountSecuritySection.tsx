import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getApiBase } from "../lib/apiBase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
const apiBase = getApiBase();

async function parseApiError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { detail?: string };
    if (typeof j.detail === "string") return j.detail;
  } catch {
    /* ignore */
  }
  return text || res.statusText;
}

export function AccountSecuritySection() {
  const { getAccessToken, refreshUser, user } = useAuth();
  const { t } = useLanguage();
  const hasPhone = Boolean(user?.phone && user.phone.trim().length > 0);

  const [cu, setCu] = useState("");
  const [np, setNp] = useState("");
  const [np2, setNp2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const [oldPhone, setOldPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [initPhone, setInitPhone] = useState("");
  const [initPass, setInitPass] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [phBusy, setPhBusy] = useState(false);

  const authHeaders = (): HeadersInit => {
    const token = getAccessToken();
    if (!token) throw new Error("Not signed in");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  };

  const pwdSave = async () => {
    if (np !== np2) {
      toast.error(t("passwordMismatchProfile"));
      return;
    }
    if (np.length < 8) {
      toast.error(t("passwordMinEight"));
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch(`${apiBase}/auth/password-change`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword: cu, newPassword: np }),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      toast.success(t("passwordUpdated"));
      setCu("");
      setNp("");
      setNp2("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setPwBusy(false);
    }
  };

  const sendPhoneCode = async () => {
    setPhBusy(true);
    try {
      const res = await fetch(`${apiBase}/auth/phone-change/request`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ oldPhone }),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      const data = (await res.json()) as { sent?: boolean; debugCode?: string };
      if (data.sent) {
        setCodeSent(true);
        toast.success(t("codeSentToast"));
      }
      if (data.debugCode) {
        toast.info(`${t("devCodeHint")} ${data.debugCode}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setPhBusy(false);
    }
  };

  const confirmPhone = async () => {
    setPhBusy(true);
    try {
      const res = await fetch(`${apiBase}/auth/phone-change/confirm`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ oldPhone, code, newPhone }),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      toast.success(t("phoneUpdated"));
      await refreshUser();
      setCodeSent(false);
      setCode("");
      setOldPhone("");
      setNewPhone("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setPhBusy(false);
    }
  };

  const setInitialPhone = async () => {
    setPhBusy(true);
    try {
      const res = await fetch(`${apiBase}/auth/phone/set`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ password: initPass, newPhone: initPhone }),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      toast.success(t("phoneUpdated"));
      await refreshUser();
      setInitPass("");
      setInitPhone("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setPhBusy(false);
    }
  };

  const body = (
    <>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t("changePasswordTitle")}</h3>
          <div className="space-y-2">
            <Label htmlFor="cur-pw">{t("currentPasswordLabel")}</Label>
            <Input
              id="cur-pw"
              type="password"
              value={cu}
              onChange={(e) => setCu(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pw">{t("newPasswordLabel")}</Label>
            <Input
              id="new-pw"
              type="password"
              value={np}
              onChange={(e) => setNp(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pw2">{t("confirmNewPasswordLabel")}</Label>
            <Input
              id="new-pw2"
              type="password"
              value={np2}
              onChange={(e) => setNp2(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button
            type="button"
            onClick={() => void pwdSave()}
            disabled={pwBusy || !cu.trim() || !np.trim()}
          >
            {pwBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("savePassword")}
          </Button>
        </div>

        <div className="space-y-3 border-t pt-6">
          <h3 className="text-sm font-semibold">{t("changePhoneTitle")}</h3>
          {hasPhone ? (
            <>
              <p className="text-sm text-muted-foreground">{t("changePhoneIntro")}</p>
              {!codeSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="old-ph">{t("mobileNumber")}</Label>
                    <Input
                      id="old-ph"
                      dir="ltr"
                      value={oldPhone}
                      onChange={(e) => setOldPhone(e.target.value)}
                      placeholder={user?.phone}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void sendPhoneCode()}
                    disabled={phBusy || oldPhone.trim().length < 8}
                  >
                    {phBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("sendCode")}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">{t("phoneStep2Hint")}</p>
                  <div className="space-y-2">
                    <Label htmlFor="vc">{t("verificationCodeLabel")}</Label>
                    <Input id="vc" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-ph">{t("newPhoneLabel")}</Label>
                    <Input id="new-ph" dir="ltr" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => void confirmPhone()}
                      disabled={phBusy || !code.trim() || newPhone.trim().length < 8}
                    >
                      {phBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("confirmPhoneChange")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setCodeSent(false)}>
                      {t("back")}
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("phoneChangeNoNumber")}</p>
              <div className="space-y-2">
                <Label htmlFor="ap">{t("accountPasswordLabel")}</Label>
                <Input
                  id="ap"
                  type="password"
                  value={initPass}
                  onChange={(e) => setInitPass(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ip">{t("newPhoneLabel")}</Label>
                <Input id="ip" dir="ltr" value={initPhone} onChange={(e) => setInitPhone(e.target.value)} />
              </div>
              <Button
                type="button"
                onClick={() => void setInitialPhone()}
                disabled={phBusy || !initPass.trim() || initPhone.trim().length < 8}
              >
                {phBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("confirmPhoneChange")}
              </Button>
            </>
          )}
        </div>
    </>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-900">{t("securitySettings")}</h3>
      <div className="space-y-8">{body}</div>
    </div>
  );
}
