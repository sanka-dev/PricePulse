import { Alert, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { withPrismaRetry } from "../db/retry";
import { logger } from "../core/logger";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function buildAlertListingWhere(alert: Alert): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {
    source: { in: ["ikman", "riyasewana"] },
    status: "ACTIVE",
  };

  if (alert.keyword) {
    where.title = {
      contains: alert.keyword,
      mode: "insensitive",
    };
  }

  if (alert.location) {
    where.location = {
      contains: alert.location,
      mode: "insensitive",
    };
  }

  if (alert.minYear !== null) {
    where.year = { gte: alert.minYear };
  }

  if (alert.maxPrice !== null) {
    where.price = { lte: alert.maxPrice };
  }

  if (alert.maxMileage !== null) {
    where.mileage = { lte: alert.maxMileage };
  }

  return where;
}

export type SnapshotAlertDemandSummary = {
  alertsProcessed: number;
  alertsFailed: number;
};

export async function snapshotAlertDemand(jobStartedAt: Date): Promise<SnapshotAlertDemandSummary> {
  const alerts = await withPrismaRetry("alert.findMany.demandSnapshot", () =>
    prisma.alert.findMany({ where: { isActive: true } }),
  );
  if (alerts.length === 0) {
    return { alertsProcessed: 0, alertsFailed: 0 };
  }

  const today = startOfUtcDay(new Date());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const lastScrapedAt = new Date();

  let alertsProcessed = 0;
  let alertsFailed = 0;

  for (const alert of alerts) {
    try {
      const where = buildAlertListingWhere(alert);

      const visibleListings = await withPrismaRetry("listing.findMany.visibleForDemand", () =>
        prisma.listing.findMany({
          where: {
            ...where,
            updatedAt: { gte: jobStartedAt },
          },
          select: { id: true, createdAt: true },
        }),
      );

      const listedCount = await withPrismaRetry("listing.count.demand", () =>
        prisma.listing.count({ where }),
      );

      const visibleIds = visibleListings.map((listing) => listing.id).sort();
      const visibleIdSet = new Set(visibleIds);

      const prior = await withPrismaRetry("alertDemandSnapshot.findUnique.previous", () =>
        prisma.alertDemandSnapshot.findUnique({
          where: {
            alertId_snapshotDate: {
              alertId: alert.id,
              snapshotDate: yesterday,
            },
          },
          select: { listingIds: true },
        }),
      );

      const priorIds = prior?.listingIds ?? [];
      const priorIdSet = new Set(priorIds);
      const soldCount = priorIds.filter((id) => !visibleIdSet.has(id)).length;
      const newCount = visibleListings.filter(
        (listing) =>
          listing.createdAt >= jobStartedAt && !priorIdSet.has(listing.id),
      ).length;

      await withPrismaRetry("alertDemandSnapshot.upsert.today", () =>
        prisma.alertDemandSnapshot.upsert({
          where: {
            alertId_snapshotDate: {
              alertId: alert.id,
              snapshotDate: today,
            },
          },
          create: {
            alertId: alert.id,
            snapshotDate: today,
            listedCount,
            leftCount: visibleIds.length,
            soldCount,
            newCount,
            listingIds: visibleIds,
            lastScrapedAt,
          },
          update: {
            listedCount,
            leftCount: visibleIds.length,
            soldCount,
            newCount,
            listingIds: visibleIds,
            lastScrapedAt,
          },
        }),
      );

      alertsProcessed += 1;
    } catch (error) {
      alertsFailed += 1;
      logger.warn(
        { err: error, alertId: alert.id, keyword: alert.keyword },
        "Failed to compute alert demand snapshot",
      );
    }
  }

  return { alertsProcessed, alertsFailed };
}
