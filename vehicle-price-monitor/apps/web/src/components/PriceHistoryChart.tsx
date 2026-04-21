'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import { Loader2, AlertCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface PriceHistoryEntry {
  id: string;
  listingId: string;
  oldPrice: number | null;
  newPrice: number;
  detectedAt: string;
}

interface PriceHistoryChartProps {
  listingId: string;
  className?: string;
}

interface ApiResponse {
  success: boolean;
  data: PriceHistoryEntry[];
}

function formatLKR(value: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-LK', {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateLong(value: string): string {
  return new Date(value).toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const entry = payload[0].payload as PriceHistoryEntry & { date: string };

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="mb-1 text-xs text-muted-foreground">
        {formatDateLong(entry.detectedAt)}
      </p>
      <p className="text-sm font-semibold text-foreground">
        {formatLKR(entry.newPrice)}
      </p>
      {entry.oldPrice !== null && (
        <p className="text-xs text-muted-foreground">
          was {formatLKR(entry.oldPrice)}
        </p>
      )}
    </div>
  );
}

export function PriceHistoryChart({ listingId, className = '' }: PriceHistoryChartProps) {
  const [data, setData] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/v1/listings/${listingId}/history`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResponse = await res.json();
        setData(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load price history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [listingId]);

  if (loading) {
    return (
      <div className={`flex h-64 items-center justify-center rounded-xl border border-border bg-card ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card ${className}`}>
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`flex h-64 items-center justify-center rounded-xl border border-border bg-card ${className}`}>
        <p className="text-sm text-muted-foreground">No price history yet</p>
      </div>
    );
  }

  const chartData = data.map((entry) => ({
    ...entry,
    date: formatDate(entry.detectedAt),
  }));

  const prices = data.map((d) => d.newPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = Math.max((maxPrice - minPrice) * 0.1, 1000);

  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">
        Price History
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            width={55}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey="newPrice"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
