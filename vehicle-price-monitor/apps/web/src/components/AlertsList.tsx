'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Tag,
  DollarSign,
  Gauge,
  Calendar,
  Trash2,
  Loader2,
  AlertCircle,
  BellOff,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Alert {
  id: string;
  keyword: string | null;
  minYear: number | null;
  maxPrice: number | null;
  maxMileage: number | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
}

interface AlertsListProps {
  refreshKey?: number;
}

function formatLKR(value: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMileage(value: number): string {
  return `${new Intl.NumberFormat('en-US').format(value)} km`;
}

export default function AlertsList({ refreshKey = 0 }: AlertsListProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/alerts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data: Alert[] = Array.isArray(json) ? json : json.data ?? [];
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/alerts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete alert');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading alerts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const active = alerts.filter((a) => a.isActive);

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 border border-dashed border-border rounded-lg">
        <BellOff className="h-8 w-8" />
        <p className="text-sm">No active alerts yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {active.length} active alert{active.length === 1 ? '' : 's'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {active.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onDelete={handleDelete}
            deleting={deletingId === alert.id}
          />
        ))}
      </div>
    </div>
  );
}

interface AlertCardProps {
  alert: Alert;
  onDelete: (id: string) => void;
  deleting: boolean;
}

function AlertCard({ alert, onDelete, deleting }: AlertCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bell className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-sm truncate">
              {alert.keyword || 'Any listing'}
            </h3>
          </div>

          <button
            onClick={() => onDelete(alert.id)}
            disabled={deleting}
            title="Delete alert"
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="space-y-1.5">
          <Detail
            icon={<Tag className="h-3.5 w-3.5" />}
            label="Keyword"
            value={alert.keyword ?? '—'}
          />
          <Detail
            icon={<DollarSign className="h-3.5 w-3.5" />}
            label="Max price"
            value={alert.maxPrice !== null ? `≤ ${formatLKR(alert.maxPrice)}` : '—'}
          />
          <Detail
            icon={<Gauge className="h-3.5 w-3.5" />}
            label="Max mileage"
            value={
              alert.maxMileage !== null ? `≤ ${formatMileage(alert.maxMileage)}` : '—'
            }
          />
          {alert.minYear !== null && (
            <Detail
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Min year"
              value={`≥ ${alert.minYear}`}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}
