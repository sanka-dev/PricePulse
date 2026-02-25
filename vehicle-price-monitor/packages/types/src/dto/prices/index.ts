export interface PriceRecordResponseDto {
  id: string;
  vehicleId: string;
  price: number;
  currency: string;
  previousPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  recordedAt: string;
  source: string;
}

export interface PriceHistoryQueryDto {
  vehicleId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface PriceHistoryResponseDto {
  vehicleId: string;
  records: PriceRecordResponseDto[];
  summary: {
    highestPrice: number;
    lowestPrice: number;
    averagePrice: number;
    priceChangeTotal: number;
    priceChangePercentTotal: number;
    recordCount: number;
  };
}

export interface PriceStatsDto {
  totalVehiclesTracked: number;
  averagePriceChange: number;
  biggestPriceDrop: {
    vehicleId: string;
    vehicleTitle: string;
    priceChange: number;
    priceChangePercent: number;
  } | null;
  priceDropsToday: number;
}
