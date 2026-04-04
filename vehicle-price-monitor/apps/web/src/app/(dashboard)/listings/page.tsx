'use client';

import ListingsGrid from '@/components/ListingsGrid';

export default function ListingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vehicle Listings</h1>
        <p className="text-muted-foreground">
          Browse scraped vehicle listings and track prices
        </p>
      </div>
      <ListingsGrid />
    </div>
  );
}
