import { getApiBase } from "./apiBase";

const apiBase = getApiBase();
const VISITOR_KEY = "trella_visitor_id";

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function trackPageview(path: string) {
  try {
    void fetch(`${apiBase}/analytics/pageview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getVisitorId(),
        path,
        referrer: document.referrer || "",
      }),
      keepalive: true,
    });
  } catch {
    /* ignore — analytics must never break the app */
  }
}

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function trackSearch(query: string) {
  const q = query.trim();
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  if (q.length < 2) return;
  searchDebounceTimer = setTimeout(() => {
    try {
      void fetch(`${apiBase}/analytics/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getVisitorId(), query: q }),
        keepalive: true,
      });
    } catch {
      /* ignore */
    }
  }, 800);
}
