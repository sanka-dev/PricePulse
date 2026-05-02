'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
} from 'recharts';

import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

export interface DemandSeriesPoint {
  date: string;
  listed: number;
  left: number;
  sold: number;
  newListings: number;
}

interface AlertDemandChartProps {
  data: DemandSeriesPoint[];
  className?: string;
}

const chartConfig: ChartConfig = {
  left: {
    label: 'Still listed',
    color: 'hsl(var(--chart-1))',
  },
  sold: {
    label: 'Sold (disappeared)',
    color: 'hsl(var(--chart-3))',
  },
  newListings: {
    label: 'New listings',
    color: 'hsl(var(--chart-2))',
  },
};

function formatDayTick(value: string): string {
  const day = Number(value.slice(-2));
  return Number.isFinite(day) ? String(day) : value;
}

function formatDateLong(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-LK', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function AlertDemandChart({ data, className }: AlertDemandChartProps) {
  return (
    <ChartContainer
      config={chartConfig}
      className={className ?? 'aspect-auto h-72 w-full'}
    >
      <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fillLeft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-left)" stopOpacity={0.6} />
            <stop offset="95%" stopColor="var(--color-left)" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="fillSold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-sold)" stopOpacity={0.6} />
            <stop offset="95%" stopColor="var(--color-sold)" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="fillNew" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-newListings)"
              stopOpacity={0.5}
            />
            <stop
              offset="95%"
              stopColor="var(--color-newListings)"
              stopOpacity={0.05}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={8}
          tickFormatter={formatDayTick}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={32}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(value) =>
                typeof value === 'string' ? formatDateLong(value) : String(value ?? '')
              }
            />
          }
        />
        <Area
          type="monotone"
          dataKey="left"
          stroke="var(--color-left)"
          fill="url(#fillLeft)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="sold"
          stroke="var(--color-sold)"
          fill="url(#fillSold)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="newListings"
          stroke="var(--color-newListings)"
          fill="url(#fillNew)"
          strokeWidth={2}
        />
        <Legend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
