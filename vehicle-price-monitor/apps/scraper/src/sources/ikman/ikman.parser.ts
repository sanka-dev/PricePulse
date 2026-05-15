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

type InitialDataAd = {
  slug?: string;
  title?: string;
  description?: string;
  details?: string;
  subtitle?: string;
  price?: string;
  imgUrl?: string;
};

function cleanPrice(value?: string): number | undefined {
  if (!value) return undefined;
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseYear(text?: string): number | undefined {
  if (!text) return undefined;
  const currentYear = new Date().getFullYear();
  const minYear = 1950;
  const maxYear = currentYear + 1;

  const matches = text.match(/\b(19\d{2}|20\d{2})\b/g);
  if (!matches) return undefined;

  const validYears = matches
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= minYear && value <= maxYear);

  if (validYears.length === 0) return undefined;

  
  return validYears[validYears.length - 1];
}

function parseMileage(text?: string, year?: number): number | undefined {
  if (!text) return undefined;

  
  const match = text.match(/\b(\d{1,3}(?:,\d{3})+|\d{2,7})\s*(km|kms|kilometers|kilometres)\b/i);
  if (!match) return undefined;

  const value = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(value)) return undefined;
  if (year && value === year) return undefined;

  
  if (value < 100 || value > 1_000_000) return undefined;

  return value;
}

function parseLocation(description?: string): string | undefined {
  if (!description) return undefined;
  const firstPart = description.split(",")[0]?.trim();
  return firstPart || undefined;
}

function parseInitialDataAds(html: string): InitialDataAd[] {
  const marker = "window.initialData = ";
  const startIndex = html.indexOf(marker);
  if (startIndex === -1) return [];

  const jsonStart = startIndex + marker.length;
  const jsonEnd = html.indexOf("</script>", jsonStart);
  if (jsonEnd === -1) return [];

  const raw = html.slice(jsonStart, jsonEnd).trim().replace(/;$/, "");
  try {
    const parsed = JSON.parse(raw) as {
      serp?: { ads?: { data?: { ads?: InitialDataAd[] } } };
    };
    return parsed.serp?.ads?.data?.ads ?? [];
  } catch {
    return [];
  }
}

function parseFromInitialData(html: string): ParsedIkmanListing[] {
  const ads = parseInitialDataAds(html);
  if (ads.length === 0) return [];

  const listings: ParsedIkmanListing[] = [];
  const seen = new Set<string>();

  for (const ad of ads) {
    if (!ad.slug || !ad.title) continue;

    const url = `https://ikman.lk/en/ad/${ad.slug}`;
    if (seen.has(url)) continue;

    const cardText = [ad.title, ad.details, ad.subtitle].filter(Boolean).join(" ");
    const year = parseYear(cardText);
    const mileage = parseMileage(ad.details ?? ad.subtitle ?? "", year);
    const location = parseLocation(ad.description);
    const imageUrls = ad.imgUrl ? [ad.imgUrl] : [];

    listings.push({
      source: "ikman",
      sourceListingId: url,
      title: ad.title.trim(),
      price: cleanPrice(ad.price),
      url,
      location,
      mileage,
      year,
      imageUrls,
    });

    seen.add(url);
  }

  return listings;
}

function parseFromCardDom(html: string): ParsedIkmanListing[] {
  const $ = cheerio.load(html);
  const listings: ParsedIkmanListing[] = [];
  const seen = new Set<string>();

  
  const cards = $("li").filter((_, el) => $(el).find("a[href*='/ad/']").length > 0);

  cards.each((_, el) => {
    const card = $(el);
    const link = card.find("a[href*='/ad/']").first();
    const href = link.attr("href");
    if (!href) return;

    const url = href.startsWith("http") ? href : `https://ikman.lk${href}`;
    if (seen.has(url)) return;

    const title = link.text().trim() || card.find("h2, h3, h4").first().text().trim();
    if (!title) return;

    const priceText = card.find("[class*='price'], [data-testid*='price']").first().text().trim();
    const locationText = card
      .find("[class*='location'], [data-testid*='location']")
      .first()
      .text()
      .trim();
    const detailsText = card.find("[class*='details'], [data-testid*='details']").first().text().trim();
    const year = parseYear(`${title} ${detailsText}`);
    const mileage = parseMileage(detailsText, year);

    const imageUrls = card
      .find("img")
      .map((__, img) => {
        const src = $(img).attr("src") || $(img).attr("data-src");
        if (!src) return undefined;
        if (src.startsWith("data:")) return undefined;
        if (src.startsWith("http")) return src;
        if (src.startsWith("//")) return `https:${src}`;
        if (src.startsWith("/")) return `https://ikman.lk${src}`;
        return undefined;
      })
      .get()
      .filter((src): src is string => Boolean(src));

    listings.push({
      source: "ikman",
      sourceListingId: url,
      title,
      price: cleanPrice(priceText),
      url,
      location: locationText || undefined,
      mileage,
      year,
      imageUrls,
    });

    seen.add(url);
  });

  return listings;
}

export function parseIkmanListings(html: string): ParsedIkmanListing[] {
  const fromInitialData = parseFromInitialData(html);
  if (fromInitialData.length > 0) return fromInitialData;
  return parseFromCardDom(html);
}
