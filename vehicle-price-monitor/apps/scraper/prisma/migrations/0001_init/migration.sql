-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "scraper";

-- CreateEnum
CREATE TYPE "scraper"."ListingStatus" AS ENUM ('ACTIVE', 'SOLD', 'INACTIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "scraper"."ScrapeRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "scraper"."Listing" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceListingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "price" DECIMAL(12,2),
    "mileage" INTEGER,
    "fuelType" TEXT,
    "transmission" TEXT,
    "location" TEXT,
    "description" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "scraper"."ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper"."PriceHistory" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "oldPrice" DECIMAL(12,2),
    "newPrice" DECIMAL(12,2) NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper"."ScrapeRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "scraper"."ScrapeRunStatus" NOT NULL DEFAULT 'RUNNING',
    "totalFound" INTEGER NOT NULL DEFAULT 0,
    "totalNew" INTEGER NOT NULL DEFAULT 0,
    "totalUpdated" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "log" JSONB,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_url_key" ON "scraper"."Listing"("url");

-- CreateIndex
CREATE INDEX "Listing_source_idx" ON "scraper"."Listing"("source");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "scraper"."Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_updatedAt_idx" ON "scraper"."Listing"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_source_sourceListingId_key" ON "scraper"."Listing"("source", "sourceListingId");

-- CreateIndex
CREATE INDEX "PriceHistory_listingId_detectedAt_idx" ON "scraper"."PriceHistory"("listingId", "detectedAt");

-- CreateIndex
CREATE INDEX "ScrapeRun_source_startedAt_idx" ON "scraper"."ScrapeRun"("source", "startedAt");

-- CreateIndex
CREATE INDEX "ScrapeRun_status_startedAt_idx" ON "scraper"."ScrapeRun"("status", "startedAt");

-- AddForeignKey
ALTER TABLE "scraper"."PriceHistory" ADD CONSTRAINT "PriceHistory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "scraper"."Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

