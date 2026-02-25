export interface PriceRecord {
  id: string;
  vehicleId: string;
  price: number;
  currency: string;
  previousPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  recordedAt: Date;
  source: string;
}

export interface PriceHistory {
  vehicleId: string;
  records: PriceRecord[];
  highestPrice: number;
  lowestPrice: number;
  averagePrice: number;
  priceChangeTotal: number;
  priceChangePercentTotal: number;
}
