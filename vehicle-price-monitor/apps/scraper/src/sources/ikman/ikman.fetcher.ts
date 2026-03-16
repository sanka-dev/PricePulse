import { chromium } from "playwright";

export async function fetchIkmanHtml(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });

    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {
      // Some pages keep long-running network connections; DOM content is enough fallback.
    });

    return await page.content();
  } finally {
    await browser.close();
  }
}
