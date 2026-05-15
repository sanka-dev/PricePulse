'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import type { MarketplaceListing } from '@/lib/marketplace-search';
import { formatLKR } from '@/lib/marketplace-search';

export function MarketplaceListingsGrid({ listings }: { listings: MarketplaceListing[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {listings.map((listing) => (
        <a
          key={`${listing.source}-${listing.sourceListingId}`}
          href={listing.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open listing: ${listing.title} on ${listing.source}`}
          className="block rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-primary/40 hover:bg-accent/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="relative aspect-[4/3] bg-muted">
            {listing.imageUrls?.[0] ? (
              <MarketplaceImage src={listing.imageUrls[0]} alt="" />
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
              {listing.year && <ListingBadge>{listing.year}</ListingBadge>}
              {listing.mileage && <ListingBadge>{listing.mileage.toLocaleString()} km</ListingBadge>}
            </div>
          </div>
        </a>
      ))}
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

function ListingBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-medium">{children}</span>
  );
}
