'use client';

import { useState, ChangeEvent } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, Input } from '@/components/ui';

interface WatchlistItem {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  currentPrice: number;
  previousPrice: number | null;
  url: string;
  imageUrl: string | null;
  addedAt: string;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = watchlist.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Watchlist</h1>
          <p className="text-muted-foreground">
            Track vehicles you&apos;re interested in
          </p>
        </div>
        <Button asChild>
          <Link href="/watchlist/add">+ Add Vehicle</Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search watchlist..."
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">Filters</Button>
      </div>

      {/* Watchlist grid */}
      {filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-medium mb-2">Your watchlist is empty</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking vehicles by adding them to your watchlist
            </p>
            <Button asChild>
              <Link href="/watchlist/add">Add Your First Vehicle</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <WatchlistCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistCard({ item }: { item: WatchlistItem }) {
  const priceChange = item.previousPrice
    ? ((item.currentPrice - item.previousPrice) / item.previousPrice) * 100
    : null;

  return (
    <Card className="overflow-hidden">
      <div className="h-48 bg-muted" />
      <CardContent className="pt-4">
        <h3 className="font-semibold truncate">{item.title}</h3>
        <p className="text-sm text-muted-foreground">
          {item.year} {item.make} {item.model}
        </p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold">
            ${item.currentPrice.toLocaleString()}
          </span>
          {priceChange !== null && (
            <span
              className={`text-sm ${
                priceChange < 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {priceChange > 0 ? '+' : ''}
              {priceChange.toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
