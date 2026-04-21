-- CreateTable
CREATE TABLE "scraper"."Alert" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "targetPrice" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alert_listingId_isActive_idx" ON "scraper"."Alert"("listingId", "isActive");

-- AddForeignKey
ALTER TABLE "scraper"."Alert" ADD CONSTRAINT "Alert_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "scraper"."Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
