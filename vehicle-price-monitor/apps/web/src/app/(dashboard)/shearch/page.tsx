'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ExternalLink, Loader2, MapPin, Search, SearchX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface MarketplaceListing {
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

interface SearchPayload {
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

function formatLKR(value: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function VehicleShearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MarketplaceListing[]>([]);
  const [bySource, setBySource] = useState({ ikman: 0, riyasewana: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const hasResults = results.length > 0;
  const canSearch = query.trim().length >= 2;

  const summary = useMemo(
    () =>
      `${results.length} result${results.length === 1 ? '' : 's'} (Ikman: ${bySource.ikman}, Riyasewana: ${bySource.riyasewana})`,
    [results.length, bySource.ikman, bySource.riyasewana],
  );

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSearch) return;

    setLoading(true);
    setError(null);
    setWarnings([]);

    try {
      const params = new URLSearchParams({
        query: query.trim(),
        limit: '24',
      });
      const response = await fetch(
        `${API_BASE}/api/v1/listings/search/marketplaces?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const body = (await response.json()) as ApiResponse<SearchPayload>;
      setResults(body.data.data);
      setBySource(body.data.bySource);
      setWarnings(body.data.errors ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setBySource({ ikman: 0, riyasewana: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vehicle Shearch</h1>
        <p className="text-muted-foreground">
          Search vehicles live across ikman.lk and riyasewana.com
        </p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search e.g. Toyota Aqua, Prado, Suzuki Alto"
                className="w-full h-11 rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={!canSearch || loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Searching Ikman and Riyasewana...</p>
        </div>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="py-10 text-center text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {!loading && !error && warnings.length > 0 && (
        <Card>
          <CardContent className="py-3 text-sm text-amber-600">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {!loading && !error && hasResults && (
        <>
          <p className="text-sm text-muted-foreground">{summary}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((listing) => (
              <article
                key={`${listing.source}-${listing.sourceListingId}`}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                <div className="relative aspect-[4/3] bg-muted">
                  {listing.imageUrls?.[0] ? (
                    <MarketplaceImage src={listing.imageUrls[0]} alt={listing.title} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                      No image
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{listing.source}</p>
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{listing.title}</h3>

                  {listing.price !== null && (
                    <p className="text-lg font-bold text-primary">{formatLKR(listing.price)}</p>
                  )}

                  {listing.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{listing.location}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    {listing.year && <Badge>{listing.year}</Badge>}
                    {listing.mileage && <Badge>{listing.mileage.toLocaleString()} km</Badge>}
                  </div>

                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Open listing <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {!loading && !error && !hasResults && query.trim() && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <SearchX className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold">No results found</h2>
            <p className="text-sm text-muted-foreground">Try a different keyword.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MarketplaceImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
        No image
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="absolute inset-0 h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-medium">
      {children}
    </span>
  );
}
