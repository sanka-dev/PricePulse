import dotenv from "dotenv";
import { logger } from "./core/logger";
import { prisma } from "./db/prisma";
import { runIkmanScraper } from "./sources/ikman/ikman.scraper";

dotenv.config();

async function main() {
  logger.info("Starting manual scraper run");
  const result = await runIkmanScraper();
  logger.info(result, "Scraper run finished");
}

main()
  .catch((error) => {
    logger.error({ err: error }, "Scraper run failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
