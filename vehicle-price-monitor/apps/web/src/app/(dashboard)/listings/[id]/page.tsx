'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  MapPin,
  Calendar,
  Gauge,
  Fuel,
  Cog,
  ExternalLink,
  Car,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Listing {
  id: string;
  source: string;
  sourceListingId: string;
  url: string;
  title: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  price: number | null;
  mileage: number | null;
  fuelType: string | null;
  transmission: string | null;
  location: string | null;
  description: string | null;
  imageUrls: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data: Listing;
}

function formatLKR(value: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const fetchListing = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/v1/listings/${id}`);
        const json = (await res.json().catch(() => null)) as ApiResponse | null;

        if (!res.ok) {
          throw new Error(
            (json as unknown as { error?: { message?: string } })?.error
              ?.message ?? `HTTP ${res.status}`,
          );
        }

        if (!cancelled) {
          setListing(json?.data ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load listing',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchListing();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="space-y-6">
      <Link
        href="/listings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to listings
      </Link>

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading listing...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 text-destructive gap-3">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && listing && (
        <>
          <ListingHeader listing={listing} />
          <PriceHistoryChart listingId={listing.id} />
          {listing.description && (
            <Card>
              <CardContent className="p-6 space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Description
                </h3>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {listing.description}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ListingHeader({ listing }: { listing: Listing }) {
  const imageUrl = listing.imageUrls?.[0];

  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,400px)_1fr]">
        <div className="relative aspect-[4/3] bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={listing.title}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Car className="h-12 w-12" />
            </div>
          )}
        </div>

        <CardContent className="p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold leading-tight">
              {listing.title}
            </h1>
            {listing.brand && (
              <p className="text-sm text-muted-foreground">
                {[listing.brand, listing.model].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {listing.price !== null && (
            <p className="text-3xl font-bold text-primary">
              {formatLKR(listing.price)}
            </p>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            {listing.year !== null && (
              <Fact icon={Calendar} label="Year" value={String(listing.year)} />
            )}
            {listing.mileage !== null && (
              <Fact
                icon={Gauge}
                label="Mileage"
                value={`${listing.mileage.toLocaleString()} km`}
              />
            )}
            {listing.fuelType && (
              <Fact icon={Fuel} label="Fuel" value={listing.fuelType} />
            )}
            {listing.transmission && (
              <Fact
                icon={Cog}
                label="Transmission"
                value={listing.transmission}
              />
            )}
            {listing.location && (
              <Fact
                icon={MapPin}
                label="Location"
                value={listing.location}
              />
            )}
          </dl>

          {listing.url && (
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              View original listing
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

interface FactProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function Fact({ icon: Icon, label, value }: FactProps) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-medium truncate">{value}</dd>
      </div>
    </div>
  );
}
