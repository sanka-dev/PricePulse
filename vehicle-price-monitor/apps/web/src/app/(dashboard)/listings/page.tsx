'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  MapPin,
  Loader2,
  AlertCircle,
  Car,
  SearchX,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import ListingsFilters from '@/components/ListingsFilters';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const FILTER_KEYS = [
  'keyword',
  'location',
  'minPrice',
  'maxPrice',
  'minYear',
  'maxMileage',
] as const;

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

export default function ListingsPage() {
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Collapse the relevant filter params into a stable query string.
  // Using a string dependency avoids re-fetching when unrelated params change.
  const filterQuery = useMemo(() => {
    if (!searchParams) return '';
    const next = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) next.set(key, value);
    }
    return next.toString();
  }, [searchParams]);

  // Whenever filters change, jump back to the first page of results.
  useEffect(() => {
    setPage(1);
  }, [filterQuery]);

  useEffect(() => {
    let cancelled = false;

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
        if (cancelled) return;

        setListings(json.data.data);
        setPagination(json.data.pagination);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load listings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchListings();
    return () => {
      cancelled = true;
    };
  }, [page, filterQuery]);

  const hasActiveFilters = filterQuery.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vehicle Listings</h1>
        <p className="text-muted-foreground">
          Browse scraped vehicle listings and track prices
        </p>
      </div>

      <ListingsFilters />

      {loading && <LoadingState />}

      {!loading && error && <ErrorState message={error} />}

      {!loading && !error && listings.length === 0 && (
        <EmptyState hasActiveFilters={hasActiveFilters} />
      )}

      {!loading && !error && listings.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {listings.length} of {pagination?.total ?? 0} listings
          </p>

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
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page >= pagination.totalPages}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-sm">Loading listings...</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-destructive gap-3">
      <AlertCircle className="h-8 w-8" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function EmptyState({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  return (
    <Card>
      <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-3">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <SearchX className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold">No results found</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {hasActiveFilters
            ? 'No listings match the current filters. Try broadening your search or clearing filters.'
            : 'There are no listings available right now.'}
        </p>
      </CardContent>
    </Card>
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
