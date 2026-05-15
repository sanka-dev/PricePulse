import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import {
  PriceHistoryResponseDto,
  PriceStatsDto,
} from '@vehicle-price-monitor/types';

export interface PriceRecord {
  id: string;
  vehicle_id: string;
  price: number;
  currency: string;
  previous_price?: number;
  price_change?: number;
  price_change_percent?: number;
  source: string;
  recorded_at: string;
}

@Injectable()
export class PricesService {
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async getListingHistory(listingId: string): Promise<
    Array<{
      oldPrice: number | null;
      newPrice: number;
      detectedAt: Date;
    }>
  > {
    const rows = await this.prisma.priceHistory.findMany({
      where: { listingId },
      orderBy: { detectedAt: 'asc' },
      select: {
        oldPrice: true,
        newPrice: true,
        detectedAt: true,
      },
    });

    return rows.map((row) => ({
      oldPrice: row.oldPrice === null ? null : Number(row.oldPrice),
      newPrice: Number(row.newPrice),
      detectedAt: row.detectedAt,
    }));
  }

  async recordPrice(
    vehicleId: string,
    price: number,
    currency: string = 'USD',
    source: string = 'manual',
  ): Promise<PriceRecord> {
    
    const { data: lastRecord } = await this.supabase
      .from('price_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    const priceChange = lastRecord ? price - lastRecord.price : null;
    const priceChangePercent =
      lastRecord && lastRecord.price > 0
        ? ((price - lastRecord.price) / lastRecord.price) * 100
        : null;

    const { data, error } = await this.supabase.from('price_records').insert({
      vehicle_id: vehicleId,
      price,
      currency,
      source,
      previous_price: lastRecord?.price ?? null,
      price_change: priceChange,
      price_change_percent: priceChangePercent,
    }).select().single();

    if (error) {
      throw new Error(`Failed to record price: ${error.message}`);
    }

    
    await this.vehiclesService.updatePrice(vehicleId, price);

    return data;
  }

  async getHistory(
    vehicleId: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number,
  ): Promise<PriceHistoryResponseDto> {
    let queryBuilder = this.supabase
      .from('price_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('recorded_at', { ascending: false });

    if (startDate) {
      queryBuilder = queryBuilder.gte('recorded_at', startDate.toISOString());
    }
    if (endDate) {
      queryBuilder = queryBuilder.lte('recorded_at', endDate.toISOString());
    }
    if (limit) {
      queryBuilder = queryBuilder.limit(limit);
    }

    const { data: records, error } = await queryBuilder;

    if (error) {
      throw new Error(`Failed to fetch price history: ${error.message}`);
    }

    if (!records || records.length === 0) {
      return {
        vehicleId,
        records: [],
        summary: {
          highestPrice: 0,
          lowestPrice: 0,
          averagePrice: 0,
          priceChangeTotal: 0,
          priceChangePercentTotal: 0,
          recordCount: 0,
        },
      };
    }

    const prices = records.map((r) => Number(r.price));
    const highestPrice = Math.max(...prices);
    const lowestPrice = Math.min(...prices);
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const oldestPrice = prices[prices.length - 1] || 0;
    const newestPrice = prices[0] || 0;
    const priceChangeTotal = newestPrice - oldestPrice;
    const priceChangePercentTotal =
      oldestPrice > 0 ? ((newestPrice - oldestPrice) / oldestPrice) * 100 : 0;

    return {
      vehicleId,
      records: records.map((r) => ({
        id: r.id,
        vehicleId: r.vehicle_id,
        price: Number(r.price),
        currency: r.currency,
        previousPrice: r.previous_price ? Number(r.previous_price) : undefined,
        priceChange: r.price_change ? Number(r.price_change) : undefined,
        priceChangePercent: r.price_change_percent ? Number(r.price_change_percent) : undefined,
        recordedAt: r.recorded_at,
        source: r.source,
      })),
      summary: {
        highestPrice,
        lowestPrice,
        averagePrice: Math.round(averagePrice * 100) / 100,
        priceChangeTotal: Math.round(priceChangeTotal * 100) / 100,
        priceChangePercentTotal: Math.round(priceChangePercentTotal * 100) / 100,
        recordCount: records.length,
      },
    };
  }

  async getStats(userId: string): Promise<PriceStatsDto> {
    const { data: vehicles } = await this.supabase
      .from('vehicles')
      .select('id')
      .eq('user_id', userId);

    return {
      totalVehiclesTracked: vehicles?.length || 0,
      averagePriceChange: 0,
      biggestPriceDrop: null,
      priceDropsToday: 0,
    };
  }
}
