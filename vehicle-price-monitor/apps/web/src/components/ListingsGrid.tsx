'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MapPin, Loader2, AlertCircle, Car } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

const FILTER_KEYS = [
  'keyword',
  'location',
  'minPrice',
  'maxPrice',
  'minYear',
  'maxMileage',
] as const;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Listing {
  id: string;
  title: string;
  price: number | null;
  location: string | null;
  imageUrls: string[];
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  fuelType: string | null;
  transmission: string | null;
  status: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ListingsResponse {
  success: boolean;
  data: {
    data: Listing[];
    pagination: Pagination;
  };
}

function formatLKR(value: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ListingsGrid() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  
  const filterQuery = useMemo(() => {
    if (!searchParams) return '';
    const out = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) out.set(key, value);
    }
    return out.toString();
  }, [searchParams]);

  
  useEffect(() => {
    setPage(1);
  }, [filterQuery]);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams(filterQuery);
        qs.set('page', String(page));
        qs.set('limit', '20');
        const res = await fetch(`${API_BASE}/api/v1/listings?${qs.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ListingsResponse = await res.json();
        setListings(json.data.data);
        setPagination(json.data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load listings');
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [page, filterQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading listings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-destructive gap-3">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Car className="h-8 w-8" />
        <p className="text-sm">No listings found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {listings.length} of {pagination?.total ?? 0} listings
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const imageUrl = listing.imageUrls?.[0];

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="overflow-hidden group hover:shadow-md transition-shadow cursor-pointer">
        <div className="relative aspect-[4/3] bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Car className="h-10 w-10" />
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">
            {listing.title}
          </h3>

          {listing.price !== null && (
            <p className="text-lg font-bold text-primary">
              {formatLKR(listing.price)}
            </p>
          )}

          {listing.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{listing.location}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {listing.year && <Badge>{listing.year}</Badge>}
            {listing.fuelType && <Badge>{listing.fuelType}</Badge>}
            {listing.transmission && <Badge>{listing.transmission}</Badge>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium">
      {children}
    </span>
  );
}
