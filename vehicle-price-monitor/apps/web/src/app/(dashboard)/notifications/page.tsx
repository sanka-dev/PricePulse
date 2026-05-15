'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const READ_STORAGE_KEY = 'pricepulse.notifications.readIds.v1';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'price_drop' | 'alert' | 'system';
  read: boolean;
  createdAt: string;
  listingUrl?: string;
  source?: string;
}

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: 'price_drop' | 'alert' | 'system';
  createdAt: string;
  listingUrl?: string;
  source?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const todayCount = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return notifications.filter((n) => new Date(n.createdAt).getTime() >= start).length;
  }, [notifications]);

  const thisWeekCount = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return notifications.filter((n) => new Date(n.createdAt) >= start).length;
  }, [notifications]);

  const load = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const readIds = readStoredReadIds();
      const res = await fetch(`${API_BASE}/api/v1/alerts/notifications?all=true&limit=120`, {
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || `HTTP ${res.status}`);
      }

      const rows = (Array.isArray(json) ? json : json?.data ?? []) as NotificationRow[];
      setNotifications(
        rows.map((item) => ({
          ...item,
          read: readIds.has(item.id),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    const next = readStoredReadIds();
    next.add(id);
    writeStoredReadIds(next);
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    writeStoredReadIds(new Set(notifications.map((n) => n.id)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with price changes and alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => load(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          {notifications.length > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Unread</p>
            <p className="mt-1 text-2xl font-bold">{unreadCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="mt-1 text-2xl font-bold">{todayCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">This Week</p>
            <p className="mt-1 text-2xl font-bold">{thisWeekCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading notifications...</span>
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="mb-2 text-lg font-medium">No notifications yet</h3>
              <p className="text-muted-foreground">
                You&apos;ll receive notifications when alerts match listings.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => markAsRead(notification.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: () => void;
}) {
  const formattedTime = new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(notification.createdAt));

  const content = (
    <div className={`py-4 ${notification.read ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{notification.title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notification.message}</p>
          {notification.source && (
            <p className="mt-1 text-xs capitalize text-muted-foreground">{notification.source}</p>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{formattedTime}</span>
      </div>
    </div>
  );

  if (notification.listingUrl) {
    return (
      <a
        href={notification.listingUrl}
        target="_blank"
        rel="noreferrer"
        onClick={onRead}
        className="block transition-colors hover:bg-accent/40"
      >
        {content}
      </a>
    );
  }

  return (
    <div onClick={onRead} className="cursor-pointer transition-colors hover:bg-accent/40">
      {content}
    </div>
  );
}

function readStoredReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function writeStoredReadIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    
  }
}
