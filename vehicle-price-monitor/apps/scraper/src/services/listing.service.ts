import { prisma } from "../db/prisma";

export type NormalizedListing = {
  source: string;
  sourceListingId: string;
  url: string;
  title: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  price?: number | null;
  mileage?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  location?: string | null;
  description?: string | null;
  imageUrls?: string[];
  rawData?: unknown;
};

export type UpsertListingResult = { type: "created" | "updated" | "unchanged"; listing: unknown };

function normalizePrice(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

export async function upsertListing(listing: NormalizedListing): Promise<UpsertListingResult> {
  const existing = await prisma.listing.findUnique({
    where: {
      source_sourceListingId: {
        source: listing.source,
        sourceListingId: listing.sourceListingId,
      },
    },
  });

  if (!existing) {
    const created = await prisma.listing.create({
      data: listing,
    });

    return { type: "created", listing: created };
  }

  const oldPrice = normalizePrice(existing.price);
  const newPrice = normalizePrice(listing.price);
  const priceChanged = oldPrice !== null && newPrice !== null && oldPrice !== newPrice;

  const updated = await prisma.listing.update({
    where: { id: existing.id },
    data: listing,
  });

  if (priceChanged) {
    await prisma.priceHistory.create({
      data: {
        listingId: existing.id,
        oldPrice,
        newPrice,
      },
    });
  }

  return {
    type: priceChanged ? "updated" : "unchanged",
    listing: updated,
  };
}
