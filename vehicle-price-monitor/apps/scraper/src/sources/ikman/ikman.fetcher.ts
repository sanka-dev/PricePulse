import { logger } from "../../core/logger";
import { chromium } from "playwright";

export async function fetchIkmanHtml(url: string): Promise<string> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
      locale: "en-US",
    });
    page.setDefaultNavigationTimeout(90_000);

    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        logger.warn({ attempt, url }, "Navigation attempt failed, retrying");
        if (attempt < 3) {
          await page.waitForTimeout(1_500 * attempt);
          // Fallback on quicker readiness if DOMContentLoaded keeps timing out.
          await page.goto(url, { waitUntil: "commit", timeout: 60_000 }).catch(() => undefined);
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {
      // Some pages keep long-running network connections; DOM content is enough fallback.
    });

    return await page.content();
  } finally {
    await browser.close();
  }
}
