import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export type ParsedRiyasewanaListing = {
  source: "riyasewana";
  sourceListingId: string;
  title: string;
  price?: number;
  url: string;
  location?: string;
  mileage?: number;
  year?: number;
  imageUrls: string[];
};

type JsonLdNode = {
  "@type"?: string;
  url?: string;
  name?: string;
  vehicleModelDate?: string;
  mileageFromOdometer?: {
    value?: string | number;
    unitCode?: string;
  };
  areaServed?: {
    name?: string;
  };
  image?: string | string[];
  item?: {
    url?: string;
    name?: string;
    image?: string | string[];
    offers?: {
      price?: string | number;
      priceCurrency?: string;
    };
    vehicleModelDate?: string;
    mileageFromOdometer?: {
      value?: string | number;
      unitCode?: string;
    };
    areaServed?: {
      name?: string;
    };
  };
  itemListElement?: JsonLdNode[];
  offers?: {
    price?: string | number;
    priceCurrency?: string;
  };
};

function cleanPrice(value?: string | number): number | undefined {
  if (value == null) return undefined;
  const raw = String(value);
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseYear(text?: string): number | undefined {
  if (!text) return undefined;
  const currentYear = new Date().getFullYear();
  const matches = text.match(/\b(19\d{2}|20\d{2})\b/g);
  if (!matches) return undefined;

  const valid = matches
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 1950 && value <= currentYear + 1);

  if (valid.length === 0) return undefined;
  return valid[valid.length - 1];
}

function parseMileage(text?: string): number | undefined {
  if (!text) return undefined;
  const match = text.match(/\b(\d{1,3}(?:,\d{3})+|\d{2,7})\s*(km|kms|kilometers|kilometres)\b/i);
  if (!match) return undefined;
  const parsed = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return undefined;
  if (parsed < 1 || parsed > 1_000_000) return undefined;
  return parsed;
}

function parseLocation(text?: string): string | undefined {
  if (!text) return undefined;
  const first = text.split("·")[0]?.trim();
  if (!first) return undefined;
  if (/ago$/i.test(first) || /^apr\s+\d{1,2}$/i.test(first)) return undefined;
  return first;
}

function canonicalizeUrl(href: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `https://riyasewana.com${href}`;
  return `https://riyasewana.com/${href}`;
}

function findListingContainer(
  $: cheerio.CheerioAPI,
  link: cheerio.Cheerio<AnyNode>,
): cheerio.Cheerio<AnyNode> {
  let current = link.parent();
  for (let depth = 0; depth < 7 && current.length > 0; depth++) {
    const text = current.text().replace(/\s+/g, " ").trim();
    if (/(Rs\.?\s*[\d,]+|Negotiable|\b(19\d{2}|20\d{2})\b)/i.test(text)) {
      return current;
    }
    current = current.parent();
  }

  return link.closest("li, article, .item, .listing, .ad-item, .single-ads, .normalAd, .search-item, div");
}

function parseImageArray(input?: string | string[]): string[] {
  if (!input) return [];
  const values = Array.isArray(input) ? input : [input];
  return values
    .filter((value): value is string => Boolean(value))
    .map((value) => canonicalizeUrl(value))
    .filter((value) => value.startsWith("http"));
}

function parseFromJsonLd(html: string): ParsedRiyasewanaListing[] {
  const $ = cheerio.load(html);
  const scripts = $("script[type='application/ld+json']");
  if (scripts.length === 0) return [];

  const listings: ParsedRiyasewanaListing[] = [];
  const seen = new Set<string>();

  scripts.each((_, script) => {
    const raw = $(script).contents().text().trim();
    if (!raw) return;

    let parsed: JsonLdNode | JsonLdNode[] | undefined;
    try {
      parsed = JSON.parse(raw) as JsonLdNode | JsonLdNode[];
    } catch {
      return;
    }

    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    const flattened = nodes.flatMap((node) => (node.itemListElement ? node.itemListElement : [node]));

    for (const node of flattened) {
      const item = (node.item ?? node) as JsonLdNode;
      const url = item.url ? canonicalizeUrl(item.url) : undefined;
      if (!url || !url.includes("/buy/")) continue;
      if (seen.has(url)) continue;

      const title = item.name?.trim();
      if (!title) continue;

      const imageUrls = parseImageArray(item.image);
      const offerPrice = cleanPrice(item.offers?.price);
      const year = parseYear(item.vehicleModelDate ?? title);
      const mileage = cleanPrice(item.mileageFromOdometer?.value);
      const location = item.areaServed?.name?.trim();

      listings.push({
        source: "riyasewana",
        sourceListingId: url,
        title,
        price: offerPrice,
        url,
        location: location || undefined,
        mileage: mileage && mileage <= 1_000_000 ? mileage : undefined,
        year,
        imageUrls,
      });
      seen.add(url);
    }
  });

  return listings;
}

function parseFromDom(html: string): ParsedRiyasewanaListing[] {
  const $ = cheerio.load(html);
  const listings: ParsedRiyasewanaListing[] = [];
  const seen = new Set<string>();

  const links = $("a[href*='/buy/']").filter((_, el) => {
    const href = $(el).attr("href") ?? "";
    return /\/buy\/.+-\d+(?:\/)?(?:\?.*)?$/i.test(href);
  });

  links.each((_, el) => {
    const link = $(el);
    const href = link.attr("href");
    if (!href) return;

    const url = canonicalizeUrl(href);
    if (seen.has(url)) return;

    const title = link.text().trim() || link.attr("title")?.trim();
    if (!title) return;

    const card = findListingContainer($, link);
    const cardText = card.text().replace(/\s+/g, " ").trim();
    const priceTextMatch = cardText.match(/(Rs\.?\s*[\d,]+|Negotiable)/i);
    const locationMileageMatch = cardText.match(
      /\b([A-Za-z][A-Za-z\s\-]+)\s*[·|]\s*(\d{1,3}(?:,\d{3})+|\d{2,7})\s*km\b/i,
    );
    const locationTextMatch = cardText.match(/\b([A-Za-z][A-Za-z\s\-]{2,40})\s*(?:·|\|)/);
    const year = parseYear(cardText);
    const mileage = parseMileage(cardText);
    const location = parseLocation(locationMileageMatch?.[1] ?? locationTextMatch?.[1] ?? cardText);

    const imageUrls = card
      .find("img")
      .map((__, img) => {
        const src = $(img).attr("src") || $(img).attr("data-src");
        if (!src || src.startsWith("data:")) return undefined;
        const normalized = canonicalizeUrl(src);
        return normalized.startsWith("http") ? normalized : undefined;
      })
      .get()
      .filter((src): src is string => Boolean(src));

    listings.push({
      source: "riyasewana",
      sourceListingId: url,
      title,
      price: cleanPrice(priceTextMatch?.[1]),
      url,
      location,
      mileage,
      year,
      imageUrls,
    });

    seen.add(url);
  });

  return listings;
}

export function parseRiyasewanaListings(html: string): ParsedRiyasewanaListing[] {
  const fromJsonLd = parseFromJsonLd(html);
  if (fromJsonLd.length > 0) return fromJsonLd;
  return parseFromDom(html);
}
