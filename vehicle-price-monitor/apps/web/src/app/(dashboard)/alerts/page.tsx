'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { AlertResponseDto } from '@vehicle-price-monitor/types';
import { AlertType, AlertStatus } from '@vehicle-price-monitor/types';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertResponseDto[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Get notified when prices change
          </p>
        </div>
        <Link href="/alerts/new">
          <Button>+ Create Alert</Button>
        </Link>
      </div>

      {/* Alert stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Alerts</p>
                <p className="text-2xl font-bold mt-1">0</p>
              </div>
              <span className="text-3xl">🔔</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Triggered Today</p>
                <p className="text-2xl font-bold mt-1">0</p>
              </div>
              <span className="text-3xl">✅</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Notifications</p>
                <p className="text-2xl font-bold mt-1">0</p>
              </div>
              <span className="text-3xl">📬</span>
            </div>
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
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-lg font-medium mb-2">No alerts yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create an alert to get notified when prices drop
              </p>
              <Link href="/alerts/new">
                <Button>Create Your First Alert</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
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
    [AlertStatus.ACTIVE]: 'bg-green-100 text-green-700',
    [AlertStatus.PAUSED]: 'bg-yellow-100 text-yellow-700',
    [AlertStatus.TRIGGERED]: 'bg-blue-100 text-blue-700',
    [AlertStatus.EXPIRED]: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
          {alert.type === AlertType.PRICE_DROP && '📉'}
          {alert.type === AlertType.PRICE_THRESHOLD && '🎯'}
          {alert.type === AlertType.NEW_LISTING && '🆕'}
          {alert.type === AlertType.PRICE_CHANGE && '📊'}
        </div>
        <div>
          <h4 className="font-medium">{alert.name}</h4>
          <p className="text-sm text-gray-500">
            {alert.type.replace(/_/g, ' ')}
            {alert.targetPrice && ` • Target: $${alert.targetPrice.toLocaleString()}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[alert.status]}`}
        >
          {alert.status}
        </span>
        <Link href={`/alerts/${alert.id}`}>
          <Button variant="ghost" size="sm">
            View
          </Button>
        </Link>
      </div>
    </div>
  );
}
