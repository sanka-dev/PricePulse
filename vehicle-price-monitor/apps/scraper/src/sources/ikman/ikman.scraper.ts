import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../../core/logger";
import { fetchIkmanHtml } from "./ikman.fetcher";
import { parseIkmanListings } from "./ikman.parser";

export type IkmanScrapeResult = {
  totalFound: number;
  totalCreated: number;
  totalUpdated: number;
  totalFailed: number;
};

export async function runIkmanScraper(): Promise<IkmanScrapeResult> {
  const url = process.env.IKMAN_URL ?? "https://ikman.lk/en/ads/sri-lanka/vehicles";

  logger.info({ source: "ikman", url }, "Fetching Ikman listings page");
  const html = await fetchIkmanHtml(url);

  const debugDir = join(process.cwd(), "debug");
  const debugFile = join(debugDir, "ikman.html");
  await mkdir(debugDir, { recursive: true });
  await writeFile(debugFile, html, "utf8");
  logger.info({ debugFile }, "Saved raw HTML for debugging");

  const listings = parseIkmanListings(html);
  logger.info({ totalParsed: listings.length }, "Parsed Ikman listings");

  const preview = listings.slice(0, 3);
  logger.info({ firstThreeListings: preview }, "First 3 parsed listings");

  return {
    totalFound: listings.length,
    totalCreated: 0,
    totalUpdated: 0,
    totalFailed: 0,
  };
}
