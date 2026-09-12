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

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  body: string;
  isRead: boolean;
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

export function AdminContactMessagesPage() {
  const { getAccessToken } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(
    async (which: "unread" | "all") => {
      const token = getAccessToken();
      if (!token) return;
      setLoading(true);
      try {
        const qs = which === "unread" ? "?unread_only=true" : "";
        const res = await fetch(`${apiBase}/admin/contact-messages${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await parseApiError(res));
        const data = (await res.json()) as ContactMessage[];
        setMessages(Array.isArray(data) ? data : []);
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

  const markRead = async (id: number) => {
    const token = getAccessToken();
    if (!token) return;
    setBusyId(id);
    try {
      const res = await fetch(`${apiBase}/admin/contact-messages/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await parseApiError(res));
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("adminContactMessagesTitle")}</h1>
        <p className="text-gray-600 mb-6">{t("adminContactMessagesSubtitle")}</p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "unread" | "all")} className="mb-6">
          <TabsList>
            <TabsTrigger value="unread">{t("adminUnreadMessages")}</TabsTrigger>
            <TabsTrigger value="all">{t("adminAllCompanies")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-16 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">{t("adminNoContactMessages")}</p>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => (
              <li key={m.id} className="border border-gray-200 rounded-lg p-4 bg-white space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {m.subject || t("contactSubjectLabel")}
                      </h3>
                      {!m.isRead ? (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                          {t("adminUnreadMessages")}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {m.name} — {m.email}
                      {m.phone ? ` — ${m.phone}` : ""}
                    </p>
                  </div>
                  <time className="text-xs text-gray-500">
                    {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                  </time>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{m.body}</p>
                {!m.isRead ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === m.id}
                    onClick={() => void markRead(m.id)}
                  >
                    {busyId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("adminMarkRead")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
