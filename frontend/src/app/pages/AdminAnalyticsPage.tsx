import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getApiBase } from "../lib/apiBase";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

const apiBase = getApiBase();

interface CountItem {
  label: string;
  count: number;
}

interface DailyPoint {
  date: string;
  views: number;
  visitors: number;
}

interface RecentVisit {
  ip: string;
  country: string;
  path: string;
  createdAt: string;
}

interface AnalyticsSummary {
  totalPageViews: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  topCountries: CountItem[];
  topPages: CountItem[];
  topSearches: CountItem[];
  dailySeries: DailyPoint[];
  recentVisits: RecentVisit[];
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

const RANGE_OPTIONS = [7, 30, 90] as const;

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function CountTable({ title, items, emptyLabel }: { title: string; items: CountItem[]; emptyLabel: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyLabel}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.label} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-800 truncate pe-2">{item.label}</span>
                <span className="font-semibold text-gray-900 shrink-0">{item.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminAnalyticsPage() {
  const { getAccessToken } = useAuth();
  const { t } = useLanguage();
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (range: number) => {
      const token = getAccessToken();
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/admin/analytics/summary?days=${range}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await parseApiError(res));
        const json = (await res.json()) as AnalyticsSummary;
        setData(json);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("adminLoadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken, t],
  );

  useEffect(() => {
    void load(days);
  }, [days, load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{t("adminAnalyticsTitle")}</h1>
            <p className="text-gray-600">{t("adminAnalyticsSubtitle")}</p>
          </div>
          <div className="flex gap-2">
            {RANGE_OPTIONS.map((r) => (
              <Button
                key={r}
                type="button"
                size="sm"
                variant={days === r ? "default" : "outline"}
                onClick={() => setDays(r)}
              >
                {t("adminAnalyticsLastNDays").replace("{n}", String(r))}
              </Button>
            ))}
          </div>
        </div>

        {loading || !data ? (
          <div className="flex justify-center py-16 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label={t("adminAnalyticsTotalViews")} value={data.totalPageViews} />
              <KpiCard label={t("adminAnalyticsUniqueVisitors")} value={data.uniqueVisitors} />
              <KpiCard label={t("adminAnalyticsNewVisitors")} value={data.newVisitors} />
              <KpiCard label={t("adminAnalyticsReturningVisitors")} value={data.returningVisitors} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("adminAnalyticsVisitsOverTime")}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.dailySeries.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {t("adminAnalyticsNoData")}
                  </p>
                ) : (
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.dailySeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="views"
                          name={t("adminAnalyticsTotalViews")}
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="visitors"
                          name={t("adminAnalyticsUniqueVisitors")}
                          stroke="#16a34a"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CountTable
                title={t("adminAnalyticsTopCountries")}
                items={data.topCountries}
                emptyLabel={t("adminAnalyticsNoData")}
              />
              <CountTable
                title={t("adminAnalyticsTopPages")}
                items={data.topPages}
                emptyLabel={t("adminAnalyticsNoData")}
              />
              <CountTable
                title={t("adminAnalyticsTopSearches")}
                items={data.topSearches}
                emptyLabel={t("adminAnalyticsNoData")}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("adminAnalyticsRecentVisits")}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {data.recentVisits.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {t("adminAnalyticsNoData")}
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 pe-4">{t("adminAnalyticsIpAddress")}</th>
                        <th className="py-2 pe-4">{t("adminAnalyticsCountry")}</th>
                        <th className="py-2 pe-4">{t("adminAnalyticsPage")}</th>
                        <th className="py-2">{t("adminAnalyticsTime")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentVisits.map((v, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-2 pe-4 font-mono text-xs" dir="ltr">
                            {v.ip}
                          </td>
                          <td className="py-2 pe-4">{v.country || "—"}</td>
                          <td className="py-2 pe-4 truncate max-w-[200px]">{v.path}</td>
                          <td className="py-2 text-xs text-gray-500">
                            {v.createdAt ? new Date(v.createdAt).toLocaleString() : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
