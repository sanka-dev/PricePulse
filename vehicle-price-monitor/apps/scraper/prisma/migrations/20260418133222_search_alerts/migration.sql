/*
  Warnings:

  - You are about to drop the column `listingId` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `targetPrice` on the `Alert` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "scraper"."Alert" DROP CONSTRAINT "Alert_listingId_fkey";

-- DropIndex
DROP INDEX "scraper"."Alert_listingId_isActive_idx";

-- AlterTable
ALTER TABLE "scraper"."Alert" DROP COLUMN "listingId",
DROP COLUMN "targetPrice",
ADD COLUMN     "keyword" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "maxMileage" INTEGER,
ADD COLUMN     "maxPrice" DOUBLE PRECISION,
ADD COLUMN     "minYear" INTEGER;

-- CreateIndex
CREATE INDEX "Alert_isActive_idx" ON "scraper"."Alert"("isActive");
