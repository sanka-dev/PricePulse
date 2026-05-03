'use client';

import dynamic from 'next/dynamic';
import { FormEvent, useMemo, useState } from 'react';
import { Loader2, Search, SearchX } from 'lucide-react';
import GlassSurface from '@/components/ui/GlassSurface';
import { Button } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { MarketplaceListingsGrid } from '@/components/marketplace-listings-grid';
import { searchMarketplaceListings, type MarketplaceListing } from '@/lib/marketplace-search';

const Beams = dynamic(() => import('@/components/ui/Beams'), { ssr: false });

export function HomeHeroSearchExperience() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [results, setResults] = useState<MarketplaceListing[]>([]);
  const [bySource, setBySource] = useState({ ikman: 0, riyasewana: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const canSearch = query.trim().length >= 2;
  const hasResults = results.length > 0;

  const summary = useMemo(
    () =>
      `${results.length} result${results.length === 1 ? '' : 's'} (Ikman: ${bySource.ikman}, Riyasewana: ${bySource.riyasewana})`,
    [results.length, bySource.ikman, bySource.riyasewana],
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSearch) return;

    const trimmed = query.trim();
    setLoading(true);
    setError(null);
    setWarnings([]);
    setHasSearched(true);
    setActiveQuery(trimmed);

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
      requestAnimationFrame(() => {
        document.getElementById('home-search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const showResultsBlock = hasSearched;

  return (
    <>
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-[1] pointer-events-none">
          <Beams
            beamWidth={3}
            beamHeight={30}
            beamNumber={20}
            lightColor="#ffffff"
            speed={2}
            noiseIntensity={1.75}
            scale={0.2}
            rotation={30}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center px-6 pt-16 pb-12 w-full">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            Smarter <span className="font-brand-pulse">search</span>.
            <br />
            <span className="text-muted-foreground">
              Better <span className="font-brand-pulse">value</span>.
            </span>
          </h1>
         

          <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto mt-8">
            <GlassSurface
              width="100%"
              height={56}
              borderRadius={32}
              borderWidth={0.08}
              brightness={55}
              opacity={0.9}
              blur={10}
              displace={8}
              backgroundOpacity={0.1}
              saturation={1.5}
              distortionScale={-160}
              redOffset={3}
              greenOffset={12}
              blueOffset={20}
              mixBlendMode="screen"
              className="relative"
            >
              <div className="w-full px-4 h-14 flex items-center gap-3 relative z-10">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search "
                  className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-0"
                  aria-label="Search vehicles"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!canSearch || loading}
                  className="rounded-xl shrink-0"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
            </GlassSurface>
          </form>
        </div>
      </section>

      {showResultsBlock && (
        <section
          id="home-search-results"
          className="relative z-10 border-t border-border bg-background px-6 py-16 scroll-mt-20"
        >
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Search results</h2>
              {activeQuery && (
                <p className="text-sm text-muted-foreground mt-1">
                  Showing results for &quot;{activeQuery}&quot;
                </p>
              )}
            </div>

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

            {!loading && !error && !hasResults && activeQuery && (
              <Card>
                <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <SearchX className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold">No results found</h3>
                  <p className="text-sm text-muted-foreground">Try a different keyword.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}
    </>
  );
}
