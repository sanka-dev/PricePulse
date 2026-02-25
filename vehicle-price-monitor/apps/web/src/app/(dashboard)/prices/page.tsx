'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

export default function PricesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Price Tracking</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Monitor price changes across your tracked vehicles
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Vehicles Tracked"
          value="0"
          icon="🚗"
        />
        <StatCard
          title="Price Drops Today"
          value="0"
          icon="📉"
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Average Change"
          value="0%"
          icon="📊"
        />
        <StatCard
          title="Biggest Drop"
          value="-"
          icon="🎯"
        />
      </div>

      {/* Price history chart placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📈</div>
              <p>Price history chart will appear here</p>
              <p className="text-sm">Add vehicles to start tracking prices</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent price changes */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Price Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <p>No price changes recorded yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  trend,
}: {
  title: string;
  value: string;
  icon: string;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <p
                className={`text-sm mt-1 ${
                  trend.isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <span className="text-3xl">{icon}</span>
        </div>
      </CardContent>
    </Card>
  );
}
