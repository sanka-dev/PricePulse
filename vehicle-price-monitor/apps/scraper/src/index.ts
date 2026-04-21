import dotenv from "dotenv";
import cron from "node-cron";
import { logger } from "./core/logger";
import { prisma } from "./db/prisma";
import { runIkmanScraper } from "./sources/ikman/ikman.scraper";

dotenv.config();

async function runScrapeJob(startMessage: string) {
  logger.info(startMessage);
  const result = await runIkmanScraper();
  logger.info(result, "Scraper run finished");
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
