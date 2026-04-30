import dotenv from "dotenv";
import cron from "node-cron";
import { logger } from "./core/logger";
import { prisma } from "./db/prisma";
import { runIkmanScraper } from "./sources/ikman/ikman.scraper";
import { runRiyasewanaScraper } from "./sources/riyasewana/riyasewana.scraper";

dotenv.config();

async function runScrapeJob(startMessage: string) {
  logger.info(startMessage);
  const sourceRuns = await Promise.allSettled([
    runIkmanScraper().then((result) => ({ source: "ikman", result })),
    runRiyasewanaScraper().then((result) => ({ source: "riyasewana", result })),
  ]);

  const totals = {
    totalFound: 0,
    totalCreated: 0,
    totalUpdated: 0,
    totalFailed: 0,
  };

  let failedSources = 0;
  for (const sourceRun of sourceRuns) {
    if (sourceRun.status === "fulfilled") {
      const { source, result } = sourceRun.value;
      totals.totalFound += result.totalFound;
      totals.totalCreated += result.totalCreated;
      totals.totalUpdated += result.totalUpdated;
      totals.totalFailed += result.totalFailed;
      logger.info({ source, ...result }, "Marketplace scraper finished");
      continue;
    }

    failedSources += 1;
    logger.error({ err: sourceRun.reason }, "Marketplace scraper failed");
  }

  logger.info({ failedSources, ...totals }, "Combined scraper run finished");

  if (failedSources === sourceRuns.length) {
    throw new Error("All marketplace scrapers failed");
  }
}

async function runManualMode() {
  try {
    await runScrapeJob("Starting manual scraper run");
  } catch (error) {
    logger.error({ err: error }, "Scraper run failed");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

function runScheduledMode() {
  const task = cron.schedule("*/10 * * * *", async () => {
    try {
      await runScrapeJob("Scheduled scraper started");
    } catch (error) {
      logger.error({ err: error }, "Scheduled scraper run failed");
    }
  });

  task.start();
  logger.info("Scraper scheduler is running (every 10 minutes)");

  const shutdown = async () => {
    task.stop();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const lifecycleEvent = process.env.npm_lifecycle_event;

if (lifecycleEvent === "scrape") {
  runManualMode();
} else {
  runScheduledMode();
}
