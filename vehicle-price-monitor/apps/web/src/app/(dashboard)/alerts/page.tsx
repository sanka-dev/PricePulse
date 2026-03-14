'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { AlertResponseDto } from '@vehicle-price-monitor/types';
import { AlertStatus } from '@vehicle-price-monitor/types';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertResponseDto[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">
            Get notified when prices change
          </p>
        </div>
        <Button asChild>
          <Link href="/alerts/new">+ Create Alert</Link>
        </Button>
      </div>

      {/* Alert stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Alerts</p>
            <p className="text-2xl font-bold mt-1">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Triggered Today</p>
            <p className="text-2xl font-bold mt-1">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Notifications</p>
            <p className="text-2xl font-bold mt-1">0</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts list */}
      <Card>
        <CardHeader>
          <CardTitle>Your Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">No alerts yet</h3>
              <p className="text-muted-foreground mb-4">
                Create an alert to get notified when prices drop
              </p>
              <Button asChild>
                <Link href="/alerts/new">Create Your First Alert</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AlertRow({ alert }: { alert: AlertResponseDto }) {
  const statusColors = {
    [AlertStatus.ACTIVE]: 'bg-green-500/10 text-green-500',
    [AlertStatus.PAUSED]: 'bg-yellow-500/10 text-yellow-500',
    [AlertStatus.TRIGGERED]: 'bg-blue-500/10 text-blue-500',
    [AlertStatus.EXPIRED]: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div>
          <h4 className="font-medium">{alert.name}</h4>
          <p className="text-sm text-muted-foreground">
            {alert.type.replace(/_/g, ' ')}
            {alert.targetPrice && ` • Target: LKR ${alert.targetPrice.toLocaleString()}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[alert.status]}`}
        >
          {alert.status}
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/alerts/${alert.id}`}>View</Link>
        </Button>
      </div>
    </div>
  );
}
