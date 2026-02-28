'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Insights and trends for your tracked vehicles
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Saved" value="$0" subtitle="Potential savings" />
        <StatCard title="Avg. Price Drop" value="0%" subtitle="Last 30 days" />
        <StatCard title="Best Time to Buy" value="-" subtitle="Based on trends" />
        <StatCard title="Market Trend" value="-" subtitle="Overall direction" />
      </div>

      {/* Price history chart */}
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Price history chart will appear here</p>
              <p className="text-sm mt-1">Add vehicles to your watchlist to see trends</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Price Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              <p>Distribution chart will appear here</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Price Drops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              <p>No price drops recorded yet</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent trends */}
      <Card>
        <CardHeader>
          <CardTitle>Market Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No trend data available yet</p>
            <p className="text-sm mt-1">Track more vehicles to see market trends</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
