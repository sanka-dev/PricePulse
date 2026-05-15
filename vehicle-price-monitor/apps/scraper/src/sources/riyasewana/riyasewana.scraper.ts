import { createRequire } from "node:module";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { z, type ZodTypeAny } from "zod";
import { logger } from "../../core/logger";
import { prisma } from "../../db/prisma";
import { fetchRiyasewanaHtml } from "./riyasewana.fetcher";
import { parseRiyasewanaListings } from "./riyasewana.parser";

export type RiyasewanaScrapeResult = {
  totalFound: number;
  totalCreated: number;
  totalUpdated: number;
  totalFailed: number;
};

const fallbackNormalizedListingSchema = z.object({
  source: z.string().min(1),
  sourceListingId: z.string().min(1),
  url: z.string().url(),
  title: z.string().min(1),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  price: z.number().nullable().optional(),
  mileage: z.number().int().nullable().optional(),
  fuelType: z.string().nullable().optional(),
  transmission: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  imageUrls: z.array(z.string().url()).default([]),
  rawData: z.unknown().nullable().optional(),
});

type NormalizedListing = z.infer<typeof fallbackNormalizedListingSchema>;
type UpsertListingResult = { type: "created" | "updated" };
type UpsertListingFn = (listing: NormalizedListing) => Promise<UpsertListingResult>;
type StartScrapeRunFn = (input: { source: string }) => Promise<{ id: string }>;
type FinishScrapeRunFn = (
  runId: string,
  input: {
    status: "SUCCESS" | "PARTIAL" | "FAILED";
    totalFound: number;
    totalNew: number;
    totalUpdated: number;
    totalFailed: number;
    log: unknown;
  },
) => Promise<unknown>;

function buildSafeRawData(input: {
  title: string;
  price?: number;
  location?: string;
  url: string;
  year?: number;
  mileage?: number;
}) {
  return {
    extractedTitle: input.title,
    extractedPrice: input.price ?? null,
    extractedLocation: input.location ?? null,
    extractedYear: input.year ?? null,
    extractedMileage: input.mileage ?? null,
    sourceUrl: input.url,
  };
}

function toJsonField(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function isRetryablePrismaConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("P1001") ||
    message.includes("P1017") ||
    message.includes("Server has closed the connection") ||
    message.includes("forcibly closed by the remote host")
  );
}

async function withRetry<T>(operationName: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryablePrismaConnectionError(error) || attempt === attempts) {
        throw error;
      }
      logger.warn(
        { operationName, attempt },
        "Retrying Riyasewana DB operation after transient connection error",
      );
      await prisma.$disconnect().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
}

function loadOptionalModule<T>(modulePath: string): T | undefined {
  try {
    const require = createRequire(__filename);
    return require(modulePath) as T;
  } catch {
    return undefined;
  }
}

function getNormalizedListingSchema(): ZodTypeAny {
  const coreSchemas = loadOptionalModule<{ normalizedListingSchema?: ZodTypeAny }>(
    join(process.cwd(), "src", "core", "schemas"),
  );
  return coreSchemas?.normalizedListingSchema ?? fallbackNormalizedListingSchema;
}

function parseMaxPages(input: string | undefined, fallback = 5): number {
  if (!input) return fallback;
  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function toSearchPathSegment(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildRiyasewanaSearchUrlForQuery(query: string): string {
  const template = process.env.RIYASEWANA_SEARCH_URL_TEMPLATE;
  const pathSegment = toSearchPathSegment(query);

  if (template && template.includes("{query}")) {
    return template.replaceAll("{query}", encodeURIComponent(pathSegment));
  }

  return `https://riyasewana.com/search/${encodeURIComponent(pathSegment)}`;
}

async function loadActiveAlertQueries(): Promise<string[]> {
  const alerts = await prisma.alert.findMany({
    where: {
      isActive: true,
      keyword: {
        not: null,
      },
    },
    select: {
      keyword: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const seen = new Set<string>();
  const queries: string[] = [];
  for (const alert of alerts) {
    const keyword = alert.keyword?.trim().toLowerCase();
    if (!keyword || seen.has(keyword)) {
      continue;
    }
    seen.add(keyword);
    queries.push(keyword);
  }

  return queries;
}

function buildRiyasewanaPageUrl(baseUrl: string, page: number): string {
  if (page <= 1) return baseUrl;

  try {
    const parsed = new URL(baseUrl);
    parsed.searchParams.set("page", String(page));
    return parsed.toString();
  } catch {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}page=${page}`;
  }
}

function buildRiyasewanaPageUrls(baseUrl: string, maxPages: number): string[] {
  return Array.from({ length: maxPages }, (_, index) => buildRiyasewanaPageUrl(baseUrl, index + 1));
}

const fallbackUpsertListing: UpsertListingFn = async (listing) => {
  const existing = await withRetry("listing.findUnique", async () =>
    prisma.listing.findUnique({
      where: {
        source_sourceListingId: {
          source: listing.source,
          sourceListingId: listing.sourceListingId,
        },
      },
      select: { id: true, price: true },
    }),
  );

  const saved = await withRetry("listing.upsert", async () =>
    prisma.listing.upsert({
      where: {
        source_sourceListingId: {
          source: listing.source,
          sourceListingId: listing.sourceListingId,
        },
      },
      create: {
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
        rawData: toJsonField(listing.rawData),
        status: "ACTIVE",
      },
      update: {
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
        rawData: toJsonField(listing.rawData),
        status: "ACTIVE",
      },
    }),
  );

  if (!existing && listing.price != null) {
    await withRetry("priceHistory.create.initial", async () =>
      prisma.priceHistory.create({
        data: {
          listingId: saved.id,
          oldPrice: null,
          newPrice: listing.price as number,
        },
      }),
    ).catch((error) => {
      logger.warn(
        { err: error, sourceListingId: listing.sourceListingId },
        "Failed to save Riyasewana initial price history",
      );
    });
  } else if (
    existing &&
    existing.price != null &&
    listing.price != null &&
    Number(existing.price) !== Number(listing.price)
  ) {
    await withRetry("priceHistory.create.change", async () =>
      prisma.priceHistory.create({
        data: {
          listingId: saved.id,
          oldPrice: existing.price,
          newPrice: listing.price as number,
        },
      }),
    ).catch((error) => {
      logger.warn(
        { err: error, sourceListingId: listing.sourceListingId },
        "Failed to save Riyasewana changed price history",
      );
    });
  }

  return { type: existing ? "updated" : "created" };
};

const fallbackStartScrapeRun: StartScrapeRunFn = async ({ source }) => {
  return withRetry("scrapeRun.create", async () =>
    prisma.scrapeRun.create({
      data: {
        source,
        status: "RUNNING",
      },
      select: { id: true },
    }),
  );
};

const fallbackFinishScrapeRun: FinishScrapeRunFn = async (runId, input) => {
  return withRetry("scrapeRun.update", async () =>
    prisma.scrapeRun.update({
      where: { id: runId },
      data: {
        finishedAt: new Date(),
        status: input.status,
        totalFound: input.totalFound,
        totalNew: input.totalNew,
        totalUpdated: input.totalUpdated,
        totalFailed: input.totalFailed,
        log: toJsonField(input.log),
      },
    }),
  );
};

export async function runRiyasewanaScraper(): Promise<RiyasewanaScrapeResult> {
  const url = process.env.RIYASEWANA_URL ?? "https://riyasewana.com/search/car";
  const maxPages = parseMaxPages(process.env.RIYASEWANA_MAX_PAGES, 5);
  const queries = await loadActiveAlertQueries();
  const queryJobs = queries.map((query) => ({
    query,
    baseUrl: buildRiyasewanaSearchUrlForQuery(query),
  }));
  const pageJobs = queryJobs.flatMap((job) =>
    buildRiyasewanaPageUrls(job.baseUrl, maxPages).map((pageUrl, pageIndex) => ({
      query: job.query,
      pageUrl,
      pageNumber: pageIndex + 1,
    })),
  );
  const source = "riyasewana";
  const normalizedListingSchema = getNormalizedListingSchema();

  const listingService = loadOptionalModule<{ upsertListing?: UpsertListingFn }>(
    join(process.cwd(), "src", "services", "listing.service"),
  );
  const scrapeRunService = loadOptionalModule<{
    startScrapeRun?: StartScrapeRunFn;
    finishScrapeRun?: FinishScrapeRunFn;
  }>(join(process.cwd(), "src", "services", "scrape-run.service"));

  const upsertListing = listingService?.upsertListing ?? fallbackUpsertListing;
  const startScrapeRun = scrapeRunService?.startScrapeRun ?? fallbackStartScrapeRun;
  const finishScrapeRun = scrapeRunService?.finishScrapeRun ?? fallbackFinishScrapeRun;

  let scrapeRunId: string | null = null;
  try {
    const scrapeRun = await startScrapeRun({ source });
    scrapeRunId = scrapeRun.id;
  } catch (error) {
    logger.warn({ err: error, source }, "Failed to create Riyasewana scrape run; continuing");
  }

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  let totalFound = 0;
  const processingErrors: Array<{ index: number; reason: string; sourceListingId?: string }> = [];

  const listings: ReturnType<typeof parseRiyasewanaListings> = [];
  const seenListingKeys = new Set<string>();
  let totalParsedAcrossPages = 0;

  logger.info(
    { source, url, activeAlertQueries: queries, maxPages, totalPages: pageJobs.length, scrapeRunId },
    "Fetching Riyasewana listings pages from active alert keywords",
  );

  if (pageJobs.length === 0) {
    logger.info({ source }, "No active alert keywords found; skipping Riyasewana query scrape");
  }

  for (const pageJob of pageJobs) {
    const { pageNumber, pageUrl, query } = pageJob;
    logger.info({ source, pageNumber, pageUrl, query }, "Fetching Riyasewana listings page");

    const html = await fetchRiyasewanaHtml(pageUrl);

    const pageListings = parseRiyasewanaListings(html);
    totalParsedAcrossPages += pageListings.length;

    let pageUniqueCount = 0;
    let pageDuplicateCount = 0;
    for (const listing of pageListings) {
      const key = `${listing.source}:${listing.sourceListingId}`;
      if (seenListingKeys.has(key)) {
        pageDuplicateCount += 1;
        continue;
      }
      seenListingKeys.add(key);
      listings.push(listing);
      pageUniqueCount += 1;
    }

    logger.info(
      {
        pageNumber,
        pageUrl,
        query,
        pageParsed: pageListings.length,
        pageUnique: pageUniqueCount,
        pageDuplicatesSkipped: pageDuplicateCount,
        totalMerged: listings.length,
      },
      "Parsed Riyasewana page",
    );
  }

  totalFound = listings.length;
  logger.info(
    {
      totalParsedAcrossPages,
      totalFound,
      totalDuplicatesSkipped: totalParsedAcrossPages - totalFound,
      totalPages: pageJobs.length,
    },
    "Parsed Riyasewana listings across pages",
  );

  for (const [index, parsedListing] of listings.entries()) {
    const candidate: NormalizedListing = {
      source: parsedListing.source,
      sourceListingId: parsedListing.sourceListingId,
      url: parsedListing.url,
      title: parsedListing.title,
      year: parsedListing.year ?? undefined,
      price: parsedListing.price ?? undefined,
      mileage: parsedListing.mileage ?? undefined,
      location: parsedListing.location ?? undefined,
      imageUrls: parsedListing.imageUrls ?? [],
      rawData: buildSafeRawData({
        title: parsedListing.title,
        price: parsedListing.price,
        location: parsedListing.location,
        year: parsedListing.year,
        mileage: parsedListing.mileage,
        url: parsedListing.url,
      }),
    };

    const validated = normalizedListingSchema.safeParse(candidate);
    if (!validated.success) {
      totalFailed += 1;
      processingErrors.push({
        index,
        sourceListingId: parsedListing.sourceListingId,
        reason: validated.error.issues.map((issue) => issue.message).join("; "),
      });
      logger.warn(
        { index, sourceListingId: parsedListing.sourceListingId },
        "Skipping Riyasewana listing due to validation failure",
      );
      continue;
    }

    try {
      const result = await upsertListing(validated.data as NormalizedListing);
      if (result.type === "created") {
        totalCreated += 1;
      } else {
        totalUpdated += 1;
      }
    } catch (error) {
      totalFailed += 1;
      const reason = error instanceof Error ? error.message : "Unknown upsert error";
      processingErrors.push({
        index,
        sourceListingId: parsedListing.sourceListingId,
        reason,
      });
      logger.warn(
        { err: error, index, sourceListingId: parsedListing.sourceListingId },
        "Failed to upsert Riyasewana listing; continuing",
      );
    }
  }

  const status: "SUCCESS" | "PARTIAL" | "FAILED" =
    totalFailed === 0 ? "SUCCESS" : totalCreated + totalUpdated > 0 ? "PARTIAL" : "FAILED";
  const scrapeLog = {
    source,
    queries,
    maxPages,
    totalPagesFetched: pageJobs.length,
    totalParsedAcrossPages,
    totalFound,
    totalCreated,
    totalUpdated,
    totalFailed,
    errors: processingErrors.slice(0, 50),
  };

  if (scrapeRunId) {
    try {
      await finishScrapeRun(scrapeRunId, {
        status,
        totalFound,
        totalNew: totalCreated,
        totalUpdated,
        totalFailed,
        log: scrapeLog,
      });
    } catch (error) {
      logger.warn({ err: error, scrapeRunId }, "Failed to finish Riyasewana scrape run tracking");
    }
  }

  return {
    totalFound,
    totalCreated,
    totalUpdated,
    totalFailed,
  };
}
