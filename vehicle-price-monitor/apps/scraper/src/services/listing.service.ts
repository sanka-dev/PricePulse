import { Prisma } from "@prisma/client";
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

function toListingWriteData(listing: NormalizedListing) {
  let rawData: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined;
  if (listing.rawData === undefined) {
    rawData = undefined;
  } else if (listing.rawData === null) {
    rawData = Prisma.JsonNull;
  } else {
    rawData = listing.rawData as Prisma.InputJsonValue;
  }

 return {
    source: listing.source,
    sourceListingId: listing.sourceListingId,
    url: listing.url,
    title: listing.title,
    brand: listing.brand ?? null,
    model: listing.model ?? null,
    year: listing.year ?? null,
    price: listing.price ?? null,
    mileage: listing.mileage ?? null,
    fuelType: listing.fuelType ?? null,
    transmission: listing.transmission ?? null,
    location: listing.location ?? null,
    description: listing.description ?? null,
    imageUrls: listing.imageUrls ?? [],
    rawData,
    status: "ACTIVE" as const,
  };
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
      data: toListingWriteData(listing),
    });

    const createdPrice = normalizePrice(listing.price);
    if (createdPrice !== null) {
      await prisma.priceHistory.create({
        data: {
          listingId: created.id,
          oldPrice: null,
          newPrice: createdPrice,
        },
      });
    }

    return { type: "created", listing: created };
  }

  console.log("DEBUG PRICE CHECK:", {
    existingPrice: existing.price,
    incomingPrice: listing.price,
  });

  const oldPrice = normalizePrice(existing.price);
  const newPrice = normalizePrice(listing.price);

  console.log("NORMALIZED:", {
    oldPrice,
    newPrice,
  });

  const priceChanged = oldPrice !== null && newPrice !== null && Number(oldPrice) !== Number(newPrice);
  console.log("PRICE CHANGED:", priceChanged);

  const updated = await prisma.listing.update({
    where: { id: existing.id },
    data: toListingWriteData(listing),
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
