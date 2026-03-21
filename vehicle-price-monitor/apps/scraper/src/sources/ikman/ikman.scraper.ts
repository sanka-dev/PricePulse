import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { z, type ZodTypeAny } from "zod";
import { prisma } from "../../db/prisma";
import { logger } from "../../core/logger";
import { fetchIkmanHtml } from "./ikman.fetcher";
import { parseIkmanListings } from "./ikman.parser";

export type IkmanScrapeResult = {
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
}) {
  return {
    extractedTitle: input.title,
    extractedPrice: input.price ?? null,
    extractedLocation: input.location ?? null,
    sourceUrl: input.url,
  };
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
      logger.warn({ operationName, attempt }, "Retrying DB operation after transient connection error");
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
  if (!input) {
    return fallback;
  }

  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function buildIkmanPageUrl(baseUrl: string, page: number): string {
  if (page <= 1) {
    return baseUrl;
  }

  try {
    const parsed = new URL(baseUrl);
    parsed.searchParams.set("page", String(page));
    return parsed.toString();
  } catch {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}page=${page}`;
  }
}

function buildIkmanPageUrls(baseUrl: string, maxPages: number): string[] {
  return Array.from({ length: maxPages }, (_, index) => buildIkmanPageUrl(baseUrl, index + 1));
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
        rawData: listing.rawData ?? null,
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
        rawData: listing.rawData ?? null,
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
          newPrice: listing.price,
        },
      }),
    ).catch((error) => {
      // Price history is useful but non-critical; keep listing saved.
      logger.warn({ err: error, sourceListingId: listing.sourceListingId }, "Failed to save initial price history");
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
          newPrice: listing.price,
        },
      }),
    ).catch((error) => {
      // Price history is useful but non-critical; keep listing saved.
      logger.warn({ err: error, sourceListingId: listing.sourceListingId }, "Failed to save changed price history");
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
        log: input.log,
      },
    }),
  );
};

export async function runIkmanScraper(): Promise<IkmanScrapeResult> {
  const url = process.env.IKMAN_URL ?? "https://ikman.lk/en/ads/sri-lanka/vehicles";
  const maxPages = parseMaxPages(process.env.IKMAN_MAX_PAGES, 5);
  const pageUrls = buildIkmanPageUrls(url, maxPages);
  const source = "ikman";
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
    logger.warn({ err: error, source }, "Failed to create scrape run; continuing without tracking");
  }
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  const processingErrors: Array<{ index: number; reason: string; sourceListingId?: string }> = [];
  let totalFound = 0;

  const debugDir = join(process.cwd(), "debug");
  const debugFile = join(debugDir, "ikman.html");
  const debugFiles: string[] = [];
  await mkdir(debugDir, { recursive: true });
  const listings: ReturnType<typeof parseIkmanListings> = [];
  const seenListingKeys = new Set<string>();
  let totalParsedAcrossPages = 0;

  logger.info(
    { source, url, maxPages, totalPages: pageUrls.length, scrapeRunId },
    "Fetching Ikman listings pages",
  );
  for (const [pageIndex, pageUrl] of pageUrls.entries()) {
    const pageNumber = pageIndex + 1;
    logger.info({ source, pageNumber, pageUrl }, "Fetching Ikman listings page");

    const html = await fetchIkmanHtml(pageUrl);
    const pageDebugFile = pageNumber === 1 ? debugFile : join(debugDir, `ikman-page-${pageNumber}.html`);
    await writeFile(pageDebugFile, html, "utf8");
    debugFiles.push(pageDebugFile);
    logger.info({ pageNumber, pageDebugFile }, "Saved raw HTML for page debugging");

    const pageListings = parseIkmanListings(html);
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
        pageParsed: pageListings.length,
        pageUnique: pageUniqueCount,
        pageDuplicatesSkipped: pageDuplicateCount,
        totalMerged: listings.length,
      },
      "Parsed Ikman page",
    );
  }

  totalFound = listings.length;
  logger.info(
    {
      totalParsedAcrossPages,
      totalFound,
      totalDuplicatesSkipped: totalParsedAcrossPages - totalFound,
      totalPages: pageUrls.length,
    },
    "Parsed Ikman listings across pages",
  );

  const preview = listings.slice(0, 3).map((listing) => ({
    source: listing.source,
    sourceListingId: listing.sourceListingId,
    title: listing.title,
    price: listing.price,
    url: listing.url,
    location: listing.location,
    mileage: listing.mileage,
    year: listing.year,
    imageUrls: listing.imageUrls.slice(0, 3),
  }));

  console.log(preview);
  logger.info({ previewCount: preview.length }, "Printed first 3 parsed listings");

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
        "Skipping listing due to validation failure",
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
        "Failed to upsert listing; continuing",
      );
    }

    if ((index + 1) % 10 === 0 || index + 1 === listings.length) {
      logger.info(
        {
          processed: index + 1,
          total: listings.length,
          totalCreated,
          totalUpdated,
          totalFailed,
        },
        "Listing processing progress",
      );
    }
  }

  const status: "SUCCESS" | "PARTIAL" | "FAILED" =
    totalFailed === 0 ? "SUCCESS" : totalCreated + totalUpdated > 0 ? "PARTIAL" : "FAILED";
  const scrapeLog = {
    source,
    debugFile,
    debugFiles,
    maxPages,
    totalPagesFetched: pageUrls.length,
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
      logger.warn({ err: error, scrapeRunId }, "Failed to finish scrape run tracking");
    }
  }

  return {
    totalFound,
    totalCreated,
    totalUpdated,
    totalFailed,
  };
}
