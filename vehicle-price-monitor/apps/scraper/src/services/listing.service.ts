import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { withPrismaRetry } from "../db/retry";

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

type NewListingForAlert = {
  title: string;
  year: number | null;
  price: Prisma.Decimal | null;
  mileage: number | null;
};

type SearchAlert = {
  keyword: string | null;
  minYear: number | null;
  maxPrice: number | null;
  maxMileage: number | null;
};

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

function listingMatchesAlert(
  listing: NewListingForAlert,
  price: number | null,
  alert: SearchAlert,
): boolean {
  if (alert.keyword) {
    if (!listing.title.toLowerCase().includes(alert.keyword.toLowerCase())) {
      return false;
    }
  }

  if (alert.minYear !== null) {
    if (listing.year === null || listing.year < alert.minYear) {
      return false;
    }
  }

  if (alert.maxPrice !== null) {
    if (price === null || price > alert.maxPrice) {
      return false;
    }
  }

  if (alert.maxMileage !== null) {
    if (listing.mileage === null || listing.mileage > alert.maxMileage) {
      return false;
    }
  }

  return true;
}

async function checkSearchAlertsForNewListing(listing: NewListingForAlert): Promise<void> {
  const alerts = await withPrismaRetry("alert.findMany.searchAlerts", () =>
    prisma.alert.findMany({
      where: { isActive: true },
      select: {
        keyword: true,
        minYear: true,
        maxPrice: true,
        maxMileage: true,
      },
    }),
  );

  if (alerts.length === 0) {
    return;
  }

  const price = normalizePrice(listing.price);

  for (const alert of alerts) {
    if (listingMatchesAlert(listing, price, alert)) {
      console.log(
        `ALERT MATCH: keyword=${alert.keyword ?? ""}, title=${listing.title}, price=${price ?? ""}`,
      );
    }
  }
}

async function checkPriceDropAlerts(
  listing: NewListingForAlert,
  oldPrice: number,
  newPrice: number,
): Promise<void> {
  
  if (newPrice >= oldPrice) {
    return;
  }

  const alerts = await withPrismaRetry("alert.findMany.priceDropAlerts", () =>
    prisma.alert.findMany({
      where: { isActive: true },
      select: {
        keyword: true,
        minYear: true,
        maxPrice: true,
        maxMileage: true,
      },
    }),
  );

  if (alerts.length === 0) {
    return;
  }

  for (const alert of alerts) {
    if (listingMatchesAlert(listing, newPrice, alert)) {
      console.log(
        `PRICE DROP ALERT: title=${listing.title}, old=${oldPrice}, new=${newPrice}`,
      );
    }
  }
}

export async function upsertListing(listing: NormalizedListing): Promise<UpsertListingResult> {
  const existingBySourceId = await withPrismaRetry("listing.findUnique.sourceId", () =>
    prisma.listing.findUnique({
      where: {
        source_sourceListingId: {
          source: listing.source,
          sourceListingId: listing.sourceListingId,
        },
      },
    }),
  );

  const existingByUrl =
    existingBySourceId ??
    (await withPrismaRetry("listing.findUnique.url", () =>
      prisma.listing.findUnique({
        where: { url: listing.url },
      }),
    ));

  if (!existingByUrl) {
    const created = await withPrismaRetry("listing.create", () =>
      prisma.listing.create({
        data: toListingWriteData(listing),
      }),
    );

    const createdPrice = normalizePrice(listing.price);
    if (createdPrice !== null) {
      await withPrismaRetry("priceHistory.create.initial", () =>
        prisma.priceHistory.create({
          data: {
            listingId: created.id,
            oldPrice: null,
            newPrice: createdPrice,
          },
        }),
      );
    }

    await checkSearchAlertsForNewListing(created);

    return { type: "created", listing: created };
  }

  const oldPrice = normalizePrice(existingByUrl.price);
  const newPrice = normalizePrice(listing.price);

  const becamePriced = oldPrice === null && newPrice !== null;
  const priceChanged =
    oldPrice !== null && newPrice !== null && Number(oldPrice) !== Number(newPrice);

  const updated = await withPrismaRetry("listing.update", () =>
    prisma.listing.update({
      where: { id: existingByUrl.id },
      data: toListingWriteData(listing),
    }),
  );

  if (becamePriced || priceChanged) {
    await withPrismaRetry("priceHistory.create.change", () =>
      prisma.priceHistory.create({
        data: {
          listingId: existingByUrl.id,
          oldPrice: oldPrice ?? null,
          newPrice: newPrice as number,
        },
      }),
    );

    
    if (oldPrice !== null && newPrice !== null && newPrice < oldPrice) {
      await checkPriceDropAlerts(updated, oldPrice, newPrice);
    }
  }

  return {
    type: priceChanged ? "updated" : "unchanged",
    listing: updated,
  };
}
