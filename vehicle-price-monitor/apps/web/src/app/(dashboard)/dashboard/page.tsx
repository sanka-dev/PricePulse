'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DashboardStats {
  activeAlerts: number;
  notifications: number;
  soldToday: number;
  listedToday: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    activeAlerts: 0,
    notifications: 0,
    soldToday: 0,
    listedToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [alertsRes, notificationsRes, analyticsRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/v1/alerts`, { cache: 'no-store' }),
          fetch(`${API_BASE}/api/v1/alerts/notifications?all=true&limit=120`, {
            cache: 'no-store',
          }),
          fetch(`${API_BASE}/api/v1/analytics/alert-demand`, { cache: 'no-store' }),
        ]);

        const alerts =
          alertsRes.status === 'fulfilled' && alertsRes.value.ok
            ? await alertsRes.value.json()
            : [];
        const notifications =
          notificationsRes.status === 'fulfilled' && notificationsRes.value.ok
            ? await notificationsRes.value.json()
            : [];
        const analytics =
          analyticsRes.status === 'fulfilled' && analyticsRes.value.ok
            ? await analyticsRes.value.json()
            : null;

        const alertRows = Array.isArray(alerts) ? alerts : alerts?.data ?? [];
        const notificationRows = Array.isArray(notifications)
          ? notifications
          : notifications?.data ?? [];
        const analyticsPayload = analytics?.data ?? analytics;

        setStats({
          activeAlerts: alertRows.filter((item: { isActive?: boolean }) => item?.isActive)
            .length,
          notifications: notificationRows.length,
          soldToday: analyticsPayload?.combined?.today?.sold ?? 0,
          listedToday: analyticsPayload?.combined?.today?.listed ?? 0,
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const statCards = useMemo(
    () => [
      { title: 'Active Alerts', value: stats.activeAlerts.toLocaleString() },
      { title: 'Notifications', value: stats.notifications.toLocaleString() },
      { title: 'Sold Today', value: stats.soldToday.toLocaleString() },
      { title: 'Listed Today', value: stats.listedToday.toLocaleString() },
    ],
    [stats],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of alerts, demand, and new listing activity.
          </p>
        </div>
        <Button asChild>
          <Link href="/shearch">Search listings</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((item) => (
          <StatCard key={item.title} title={item.title} value={item.value} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Loading dashboard data...</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Dashboard is connected and up to date.</p>
              <p className="text-sm mt-1">
                Use Search, Alerts, Analytics, and Notifications for details.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
