'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Clock,
  Loader2,
  PackageOpen,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import {
  AlertDemandChart,
  type DemandSeriesPoint,
} from '@/components/AlertDemandChart';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AlertSummary {
  alertId: string;
  keyword: string | null;
  minYear: number | null;
  maxPrice: number | null;
  maxMileage: number | null;
  location: string | null;
  isActive: boolean;
  today: {
    listed: number;
    left: number;
    sold: number;
    newListings: number;
    lastScrapedAt: string | null;
  };
  monthTotals: {
    sold: number;
    newListings: number;
    averageLeft: number;
    averageListed: number;
  };
  series: DemandSeriesPoint[];
}

interface CombinedSummary {
  activeAlerts: number;
  today: {
    listed: number;
    left: number;
    sold: number;
    newListings: number;
  };
  month: {
    sold: number;
    newListings: number;
    averageLeft: number;
    averageListed: number;
  };
  series: DemandSeriesPoint[];
}

interface AlertDemandResponse {
  month: string;
  rangeStart: string;
  rangeEnd: string;
  combined: CombinedSummary;
  alerts: AlertSummary[];
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
}

function currentMonthLabel(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function describeAlert(alert: AlertSummary): string {
  const parts = [
    alert.keyword ? `"${alert.keyword}"` : 'Any keyword',
    alert.minYear !== null ? `from ${alert.minYear}` : null,
    alert.maxPrice !== null
      ? `under ${new Intl.NumberFormat('en-LK', {
          style: 'currency',
          currency: 'LKR',
          maximumFractionDigits: 0,
        }).format(alert.maxPrice)}`
      : null,
    alert.maxMileage !== null
      ? `below ${new Intl.NumberFormat('en-US').format(alert.maxMileage)} km`
      : null,
    alert.location ? `in ${alert.location}` : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Not yet scraped';
  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  return date.toLocaleDateString('en-LK', { month: 'long', year: 'numeric' });
}

export default function AnalyticsPage() {
  const [month, setMonth] = useState(() => currentMonthLabel());
  const [data, setData] = useState<AlertDemandResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE}/api/v1/analytics/alert-demand?month=${month}`,
          { cache: 'no-store' },
        );
        const json = (await res.json().catch(() => null)) as
          | ApiEnvelope<AlertDemandResponse>
          | AlertDemandResponse
          | null;

        if (!res.ok) {
          const message =
            (json as { error?: { message?: string } } | null)?.error?.message ||
            `HTTP ${res.status}`;
          throw new Error(message);
        }

        const payload =
          json && 'data' in json && json.data
            ? (json.data as AlertDemandResponse)
            : (json as AlertDemandResponse);

        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [month],
  );

  useEffect(() => {
    load();
  }, [load]);

  const alertOptions = useMemo(() => {
    const months: string[] = [];
    const today = new Date();
    for (let i = 0; i < 12; i += 1) {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
      months.push(
        `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      );
    }
    return months;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Demand trends across alerted vehicles. Sold counts come from
            listings that were visible yesterday but disappeared from the
            listing sites today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground" htmlFor="month-select">
            Month
          </label>
          <select
            id="month-select"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          >
            {alertOptions.map((value) => (
              <option key={value} value={value}>
                {formatMonthLabel(value)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading demand analytics...</span>
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : !data ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              icon={<BellRing className="h-4 w-4" />}
              label="Active alerts"
              value={formatNumber(data.combined.activeAlerts)}
              subtitle={`${data.alerts.length} total tracked`}
            />
            <StatCard
              icon={<PackageOpen className="h-4 w-4" />}
              label="Listed today"
              value={formatNumber(data.combined.today.listed)}
              subtitle={`${formatNumber(data.combined.today.left)} still visible`}
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Sold today"
              value={formatNumber(data.combined.today.sold)}
              subtitle="Disappeared since yesterday"
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label={`${formatMonthLabel(data.month)} sold`}
              value={formatNumber(data.combined.month.sold)}
              subtitle={`${formatNumber(data.combined.month.newListings)} new this month`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly demand</CardTitle>
              <CardDescription>
                {formatMonthLabel(data.month)} - daily totals across every
                alert. Still listed shows inventory left, sold counts items
                that vanished from listing sites.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.combined.series.some(
                (point) =>
                  point.listed > 0 ||
                  point.left > 0 ||
                  point.sold > 0 ||
                  point.newListings > 0,
              ) ? (
                <AlertDemandChart data={data.combined.series} />
              ) : (
                <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <Clock className="h-6 w-6" />
                  <p>No demand snapshots yet for this month.</p>
                  <p className="text-xs">
                    Snapshots are written after each scraper run when active
                    alerts exist.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Per-alert breakdown</h2>
              <p className="text-sm text-muted-foreground">
                Today&apos;s listing inventory and the running monthly demand
                trend for each alert.
              </p>
            </div>

            {data.alerts.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {data.alerts.map((alert) => (
                  <AlertDemandCard key={alert.alertId} alert={alert} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function AlertDemandCard({ alert }: { alert: AlertSummary }) {
  const hasData = alert.series.some(
    (point) =>
      point.listed > 0 ||
      point.left > 0 ||
      point.sold > 0 ||
      point.newListings > 0,
  );

  return (
    <Card>
      <CardHeader className="space-y-1.5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {alert.keyword || 'Any listing'}
            </CardTitle>
            <CardDescription>{describeAlert(alert)}</CardDescription>
          </div>
          {!alert.isActive && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              Inactive
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Listed" value={alert.today.listed} />
          <Metric label="Left" value={alert.today.left} />
          <Metric label="Sold today" value={alert.today.sold} />
        </div>

        {hasData ? (
          <AlertDemandChart data={alert.series} className="aspect-auto h-48 w-full" />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            Awaiting first snapshot
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            Month sold: {formatNumber(alert.monthTotals.sold)} · New:{' '}
            {formatNumber(alert.monthTotals.newListings)}
          </span>
          <span>Last scrape: {formatDateTime(alert.today.lastScrapedAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{formatNumber(value)}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
      <BellRing className="h-8 w-8 text-muted-foreground" />
      <div>
        <h2 className="font-semibold">No alerts yet</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Create an alert and let the scraper run for at least one day to see
          demand analytics.
        </p>
      </div>
    </div>
  );
}
