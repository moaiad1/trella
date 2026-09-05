import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  fetchInquiryContext,
  fetchInquiryMessages,
  markInquiryRead,
  postInquiryMessage,
  type ChatMessage,
  type InquiryContext,
} from "../lib/chatApi";

const POLL_MS = 5000;

export function ChatThreadPage() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const id = inquiryId ? parseInt(inquiryId, 10) : NaN;
  const navigate = useNavigate();
  const { user, getAccessToken } = useAuth();
  const { t } = useLanguage();

  const [ctx, setCtx] = useState<InquiryContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    const list = await fetchInquiryMessages(id, getAccessToken);
    setMessages(list);
  }, [id, getAccessToken]);

  const loadAll = useCallback(async () => {
    if (!Number.isFinite(id)) {
      setLoading(false);
      return;
    }
    try {
      const c = await fetchInquiryContext(id, getAccessToken);
      setCtx(c);
      await loadMessages();
      await markInquiryRead(id, getAccessToken);
      window.dispatchEvent(new CustomEvent("trella-chat-updated"));
    } catch {
      toast.error(t("chatLoadFailed"));
      navigate("/account");
    } finally {
      setLoading(false);
    }
  }, [id, getAccessToken, loadMessages, navigate, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    const tmr = window.setInterval(() => {
      void loadMessages().catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(tmr);
  }, [id, loadMessages]);

  /* Scroll only the messages pane — scrollIntoView on a child scrolls the window and feels like the page is "forced" down. */
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !Number.isFinite(id)) return;
    setSending(true);
    try {
      const msg = await postInquiryMessage(id, text, getAccessToken);
      setMessages((prev) => [...prev, msg]);
      setDraft("");
      window.dispatchEvent(new CustomEvent("trella-chat-updated"));
    } catch {
      toast.error(t("messageSendFailed"));
    } finally {
      setSending(false);
    }
  };

  if (!Number.isFinite(id)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-600">{t("chatInvalidThread")}</p>
      </div>
    );
  }

  if (loading && !ctx) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/account" aria-label={t("back")}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {ctx?.truckLabel ?? "…"}
            </h1>
            {ctx?.truckRefNo ? (
              <p className="text-[11px] font-mono text-muted-foreground truncate">
                {t("listingRef")}: {ctx.truckRefNo}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground truncate">
              {ctx?.role === "seller"
                ? t("chatYouAreSeller")
                : t("chatYouAreBuyer")}
            </p>
          </div>
          {ctx ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/truck/${ctx.truckId}`}>{t("viewListing")}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 flex flex-col min-h-0">
        <div
          ref={messagesScrollRef}
          className="min-h-0 flex-1 overflow-y-auto space-y-3 pb-4"
        >
          {messages.map((m) => {
            const mine = user != null && m.senderUserId === user.id;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-sm ${
                    mine
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
                  }`}
                >
                  {!mine ? (
                    <p className="text-xs font-medium text-blue-700 mb-1">
                      {m.senderEmail}
                    </p>
                  ) : null}
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  <time
                    className={`text-[10px] mt-1 block ${
                      mine ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {new Date(m.createdAt).toLocaleString()}
                  </time>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-3 bg-gray-50 sticky bottom-0 pb-[env(safe-area-inset-bottom)]">
          <div className="flex gap-2 items-end">
            <Textarea
              rows={2}
              className="resize-none bg-white min-h-[44px]"
              placeholder={t("chatReplyPlaceholder")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button
              type="button"
              className="shrink-0 h-[44px]"
              onClick={() => void send()}
              disabled={sending || !draft.trim()}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
