import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "../context/LanguageContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { getApiBase } from "../lib/apiBase";

const apiBase = getApiBase();

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

export function ContactPage() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, subject, body }),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      setSent(true);
      toast.success(t("contactSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("contactFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{t("contactPageTitle")}</CardTitle>
          <CardDescription>{t("contactPageSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-center text-gray-700 py-6">{t("contactSuccess")}</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="contact-name">{t("contactNameLabel")}</Label>
                <Input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact-email">{t("email")}</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact-phone">
                  {t("mobileNumber")} ({t("optional")})
                </Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966 5xxxxxxxx"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact-subject">
                  {t("contactSubjectLabel")} ({t("optional")})
                </Label>
                <Input
                  id="contact-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact-body">{t("contactMessageLabel")}</Label>
                <Textarea
                  id="contact-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  minLength={1}
                  rows={5}
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "…" : t("contactSubmit")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
