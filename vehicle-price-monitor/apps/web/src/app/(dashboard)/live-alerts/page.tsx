'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, BellRing, Clock, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const REFRESH_INTERVAL_MS = 30_000;

interface AlertSummary {
  id: string;
  keyword: string | null;
  minYear: number | null;
  maxPrice: number | null;
  maxMileage: number | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ListingMatch {
  id: string;
  source: string;
  title: string;
  url: string;
  price: number | null;
  year: number | null;
  mileage: number | null;
  location: string | null;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

interface AlertUpdate {
  alert: AlertSummary;
  totalMatches: number;
  latestMatchAt: string | null;
  matches: ListingMatch[];
}

function formatLKR(value: number | null): string {
  if (value === null) return 'Price unavailable';
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) return 'No matches yet';
  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function describeAlert(alert: AlertSummary): string {
  const parts = [
    alert.keyword ? `"${alert.keyword}"` : 'Any keyword',
    alert.minYear !== null ? `from ${alert.minYear}` : null,
    alert.maxPrice !== null ? `under ${formatLKR(alert.maxPrice)}` : null,
    alert.maxMileage !== null ? `below ${formatNumber(alert.maxMileage)} km` : null,
    alert.location ? `in ${alert.location}` : null,
  ].filter(Boolean);

  return parts.join(' · ');
}

export default function LiveAlertsPage() {
  const [updates, setUpdates] = useState<AlertUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/alerts/live-updates?all=true`, {
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || `HTTP ${res.status}`);
      }

      const data: AlertUpdate[] = Array.isArray(json) ? json : json?.data ?? [];
      setUpdates(data);
      setLastLoadedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live alert updates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const totalMatches = useMemo(
    () => updates.reduce((sum, update) => sum + update.totalMatches, 0),
    [updates],
  );
  const alertsWithMatches = updates.filter((update) => update.totalMatches > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Alert Updates</h1>
          <p className="text-muted-foreground">
            Latest Ikman and Riyasewana listings matching your active alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Active alerts" value={updates.length} />
        <MetricCard label="Alerts with matches" value={alertsWithMatches} />
        <MetricCard label="Total matching listings" value={totalMatches} />
      </div>

      {lastLoadedAt && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Last updated {formatDateTime(lastLoadedAt.toISOString())}. Auto-refreshes every 30 seconds.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading live alert updates...</span>
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : updates.length === 0 ? (
        <EmptyState
          title="No active alerts yet"
          message="Create an alert first. The scraper will use those alert keywords to search Ikman and Riyasewana."
        />
      ) : (
        <div className="space-y-5">
          {updates.map((update) => (
            <AlertUpdateCard key={update.alert.id} update={update} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{formatNumber(value)}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
      <BellRing className="h-8 w-8 text-muted-foreground" />
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      <Link href="/alerts" className="text-sm font-medium text-primary hover:underline">
        Create alert
      </Link>
    </div>
  );
}

function AlertUpdateCard({ update }: { update: AlertUpdate }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">{update.alert.keyword || 'Any listing'}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{describeAlert(update.alert)}</p>
          </div>
          <div className="text-sm text-muted-foreground md:text-right">
            <p>{formatNumber(update.totalMatches)} matching listings</p>
            <p>Latest: {formatDateTime(update.latestMatchAt)}</p>
          </div>
        </div>

        {update.matches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No scraped listings match this alert yet.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {update.matches.map((match) => (
              <ListingMatchCard key={`${update.alert.id}-${match.id}`} match={match} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ListingMatchCard({ match }: { match: ListingMatch }) {
  const imageUrl = match.imageUrls?.[0];

  return (
    <a
      href={match.url}
      target="_blank"
      rel="noreferrer"
      className="group flex gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
    >
      <div className="h-20 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold group-hover:text-primary">
            {match.title}
          </h3>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>

        <p className="text-sm font-semibold text-primary">{formatLKR(match.price)}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="capitalize">{match.source}</span>
          {match.year !== null && <span>{match.year}</span>}
          {match.mileage !== null && <span>{formatNumber(match.mileage)} km</span>}
          {match.location && <span>{match.location}</span>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Updated {formatDateTime(match.updatedAt)}
        </p>
      </div>
    </a>
  );
}
