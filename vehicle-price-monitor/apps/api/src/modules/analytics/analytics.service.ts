import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface AlertDemandQuery {
  month?: string;
}

export interface DailyDemandPoint {
  date: string;
  listed: number;
  left: number;
  sold: number;
  newListings: number;
}

export interface AlertDemandSummary {
  alertId: string;
  keyword: string | null;
  minYear: number | null;
  maxPrice: number | null;
  maxMileage: number | null;
  location: string | null;
  isActive: boolean;
  today: {
    listed: number;
    left: number;
    sold: number;
    newListings: number;
    lastScrapedAt: string | null;
  };
  monthTotals: {
    sold: number;
    newListings: number;
    averageLeft: number;
    averageListed: number;
  };
  series: DailyDemandPoint[];
}

export interface AlertDemandAnalyticsResponse {
  month: string;
  rangeStart: string;
  rangeEnd: string;
  combined: {
    activeAlerts: number;
    today: {
      listed: number;
      left: number;
      sold: number;
      newListings: number;
    };
    month: {
      sold: number;
      newListings: number;
      averageLeft: number;
      averageListed: number;
    };
    series: DailyDemandPoint[];
  };
  alerts: AlertDemandSummary[];
}

@Injectable()
export class AnalyticsService {
  private readonly prisma = new PrismaClient();

  async getAlertDemand(
    query: AlertDemandQuery = {},
  ): Promise<AlertDemandAnalyticsResponse> {
    const { rangeStart, rangeEnd, monthLabel } = this.resolveMonthRange(query.month);

    const alerts = await this.prisma.alert.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    const snapshots = await this.prisma.alertDemandSnapshot.findMany({
      where: {
        snapshotDate: { gte: rangeStart, lte: rangeEnd },
      },
      orderBy: { snapshotDate: 'asc' },
    });

    const snapshotsByAlert = new Map<string, typeof snapshots>();
    for (const snapshot of snapshots) {
      const list = snapshotsByAlert.get(snapshot.alertId) ?? [];
      list.push(snapshot);
      snapshotsByAlert.set(snapshot.alertId, list);
    }

    const todayKey = this.toDateKey(this.startOfUtcDay(new Date()));

    const alertSummaries: AlertDemandSummary[] = alerts.map((alert) => {
      const list = snapshotsByAlert.get(alert.id) ?? [];
      const series = this.buildSeries(list, rangeStart, rangeEnd);

      const todaySnap = list.find(
        (snap) => this.toDateKey(snap.snapshotDate) === todayKey,
      );

      const monthTotals = this.aggregateSeries(series);

      return {
        alertId: alert.id,
        keyword: alert.keyword,
        minYear: alert.minYear,
        maxPrice: alert.maxPrice === null ? null : Number(alert.maxPrice),
        maxMileage: alert.maxMileage,
        location: alert.location,
        isActive: alert.isActive,
        today: {
          listed: todaySnap?.listedCount ?? 0,
          left: todaySnap?.leftCount ?? 0,
          sold: todaySnap?.soldCount ?? 0,
          newListings: todaySnap?.newCount ?? 0,
          lastScrapedAt: todaySnap?.lastScrapedAt.toISOString() ?? null,
        },
        monthTotals,
        series,
      };
    });

    const combinedSeries = this.combineSeries(
      alertSummaries.map((alert) => alert.series),
      rangeStart,
      rangeEnd,
    );

    const combinedToday = alertSummaries.reduce(
      (acc, alert) => ({
        listed: acc.listed + alert.today.listed,
        left: acc.left + alert.today.left,
        sold: acc.sold + alert.today.sold,
        newListings: acc.newListings + alert.today.newListings,
      }),
      { listed: 0, left: 0, sold: 0, newListings: 0 },
    );

    const combinedMonth = this.aggregateSeries(combinedSeries);

    return {
      month: monthLabel,
      rangeStart: this.toDateKey(rangeStart),
      rangeEnd: this.toDateKey(rangeEnd),
      combined: {
        activeAlerts: alerts.filter((alert) => alert.isActive).length,
        today: combinedToday,
        month: combinedMonth,
        series: combinedSeries,
      },
      alerts: alertSummaries,
    };
  }

  private resolveMonthRange(monthInput?: string): {
    rangeStart: Date;
    rangeEnd: Date;
    monthLabel: string;
  } {
    const now = new Date();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth();

    if (monthInput) {
      const match = /^(\d{4})-(\d{2})$/.exec(monthInput);
      if (!match) {
        throw new BadRequestException('month must be formatted as YYYY-MM');
      }
      year = Number(match[1]);
      month = Number(match[2]) - 1;
      if (
        !Number.isInteger(year) ||
        year < 2000 ||
        year > 2100 ||
        month < 0 ||
        month > 11
      ) {
        throw new BadRequestException('month is out of range');
      }
    }

    const rangeStart = new Date(Date.UTC(year, month, 1));
    const rangeEnd = new Date(Date.UTC(year, month + 1, 0));
    const monthLabel = `${rangeStart.getUTCFullYear()}-${String(
      rangeStart.getUTCMonth() + 1,
    ).padStart(2, '0')}`;

    return { rangeStart, rangeEnd, monthLabel };
  }

  private buildSeries(
    snapshots: Array<{
      snapshotDate: Date;
      listedCount: number;
      leftCount: number;
      soldCount: number;
      newCount: number;
    }>,
    rangeStart: Date,
    rangeEnd: Date,
  ): DailyDemandPoint[] {
    const map = new Map<string, DailyDemandPoint>();
    for (const snap of snapshots) {
      const key = this.toDateKey(snap.snapshotDate);
      map.set(key, {
        date: key,
        listed: snap.listedCount,
        left: snap.leftCount,
        sold: snap.soldCount,
        newListings: snap.newCount,
      });
    }

    const series: DailyDemandPoint[] = [];
    const cursor = new Date(rangeStart);
    while (cursor.getTime() <= rangeEnd.getTime()) {
      const key = this.toDateKey(cursor);
      series.push(
        map.get(key) ?? {
          date: key,
          listed: 0,
          left: 0,
          sold: 0,
          newListings: 0,
        },
      );
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return series;
  }

  private combineSeries(
    seriesList: DailyDemandPoint[][],
    rangeStart: Date,
    rangeEnd: Date,
  ): DailyDemandPoint[] {
    const totals = new Map<string, DailyDemandPoint>();
    for (const series of seriesList) {
      for (const point of series) {
        const existing = totals.get(point.date);
        if (existing) {
          existing.listed += point.listed;
          existing.left += point.left;
          existing.sold += point.sold;
          existing.newListings += point.newListings;
        } else {
          totals.set(point.date, { ...point });
        }
      }
    }

    const result: DailyDemandPoint[] = [];
    const cursor = new Date(rangeStart);
    while (cursor.getTime() <= rangeEnd.getTime()) {
      const key = this.toDateKey(cursor);
      result.push(
        totals.get(key) ?? {
          date: key,
          listed: 0,
          left: 0,
          sold: 0,
          newListings: 0,
        },
      );
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
  }

  private aggregateSeries(series: DailyDemandPoint[]): {
    sold: number;
    newListings: number;
    averageLeft: number;
    averageListed: number;
  } {
    if (series.length === 0) {
      return { sold: 0, newListings: 0, averageLeft: 0, averageListed: 0 };
    }

    let sold = 0;
    let newListings = 0;
    let leftSum = 0;
    let listedSum = 0;
    let observed = 0;

    for (const point of series) {
      sold += point.sold;
      newListings += point.newListings;
      if (point.listed > 0 || point.left > 0) {
        leftSum += point.left;
        listedSum += point.listed;
        observed += 1;
      }
    }

    const denom = observed === 0 ? 1 : observed;
    return {
      sold,
      newListings,
      averageLeft: Math.round(leftSum / denom),
      averageListed: Math.round(listedSum / denom),
    };
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private toDateKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
      2,
      '0',
    )}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }
}
