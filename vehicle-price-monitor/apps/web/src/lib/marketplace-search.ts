const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface MarketplaceListing {
  source: 'ikman' | 'riyasewana';
  sourceListingId: string;
  title: string;
  price: number | null;
  url: string;
  location: string | null;
  mileage: number | null;
  year: number | null;
  imageUrls: string[];
}

export interface MarketplaceSearchPayload {
  query: string;
  data: MarketplaceListing[];
  bySource: {
    ikman: number;
    riyasewana: number;
  };
  errors: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export function formatLKR(value: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export async function searchMarketplaceListings(query: string): Promise<MarketplaceSearchPayload> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    throw new Error('Enter at least 2 characters');
  }

  const params = new URLSearchParams({
    query: trimmed,
    limit: '24',
  });
  const response = await fetch(
    `${API_BASE}/api/v1/listings/search/marketplaces?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<MarketplaceSearchPayload>;
  return body.data;
}
