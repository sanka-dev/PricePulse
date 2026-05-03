'use client';

import { Suspense, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Search, SearchX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { MarketplaceListingsGrid } from '@/components/marketplace-listings-grid';
import { searchMarketplaceListings, type MarketplaceListing } from '@/lib/marketplace-search';

function VehicleSearchContent() {
  const searchParams = useSearchParams();
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

  const runSearch = useCallback(async (rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (trimmed.length < 2) return;

    setLoading(true);
    setError(null);
    setWarnings([]);

    try {
      const payload = await searchMarketplaceListings(trimmed);
      setResults(payload.data);
      setBySource(payload.bySource);
      setWarnings(payload.errors ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setBySource({ ikman: 0, riyasewana: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (!q || q.trim().length < 2) return;
    setQuery(q);
    void runSearch(q);
  }, [searchParams, runSearch]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSearch) return;
    await runSearch(query);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vehicle Search</h1>
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
          <MarketplaceListingsGrid listings={results} />
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

export default function VehicleSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading search…</p>
        </div>
      }
    >
      <VehicleSearchContent />
    </Suspense>
  );
}
