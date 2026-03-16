import * as cheerio from "cheerio";

export type ParsedIkmanListing = {
  source: "ikman";
  sourceListingId: string;
  title: string;
  price?: number;
  url: string;
  location?: string;
  mileage?: number;
  year?: number;
  imageUrls: string[];
};

function parsePriceToNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const digits = value.replace(/[^\d.,]/g, "").replace(/,/g, "");
  if (!digits) return undefined;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseIntSafe(value?: string): number | undefined {
  if (!value) return undefined;
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseIkmanListings(html: string): ParsedIkmanListing[] {
  const $ = cheerio.load(html);
  const listings: ParsedIkmanListing[] = [];

  // Broad card selector to stay resilient across markup changes.
  const cards = $("li, article, div").filter((_, el) => {
    const node = $(el);
    const hasLink = node.find("a[href*='/ad/']").length > 0;
    const hasPrice = /rs\.?|lkr/i.test(node.text());
    return hasLink && hasPrice;
  });

  cards.each((_, el) => {
    const card = $(el);
    const linkEl = card.find("a[href*='/ad/']").first();
    const href = linkEl.attr("href");
    if (!href) return;

    const url = href.startsWith("http") ? href : `https://ikman.lk${href}`;
    const title = linkEl.text().trim() || card.find("h2, h3, h4").first().text().trim();
    if (!title) return;

    const priceText =
      card.find("[class*='price'], [data-testid*='price']").first().text().trim() || card.text();

    const location = card
      .find("[class*='location'], [data-testid*='location']")
      .first()
      .text()
      .trim();

    const metaText = card.text();
    const mileageMatch = metaText.match(/(\d[\d,]*)\s*(km|kms)/i);
    const yearMatch = metaText.match(/\b(19\d{2}|20\d{2})\b/);

    const imageUrls = card
      .find("img")
      .map((__, img) => $(img).attr("src") || $(img).attr("data-src"))
      .get()
      .filter((src): src is string => Boolean(src))
      .map((src) => (src.startsWith("http") ? src : `https:${src}`));

    listings.push({
      source: "ikman",
      sourceListingId: url,
      title,
      price: parsePriceToNumber(priceText),
      url,
      location: location || undefined,
      mileage: parseIntSafe(mileageMatch?.[1]),
      year: parseIntSafe(yearMatch?.[1]),
      imageUrls,
    });
  });

  return listings;
}
