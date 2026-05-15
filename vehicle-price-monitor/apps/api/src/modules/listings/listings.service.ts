import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Listing as PrismaListing, PriceHistory as PrismaPriceHistory, Prisma, PrismaClient } from '@prisma/client';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

export interface GetListingsQuery {
  page?: string;
  limit?: string;
  minPrice?: string;
  maxPrice?: string;
  minYear?: string;
  maxMileage?: string;
  keyword?: string;
  location?: string;
}

export interface ListingResponse extends Omit<PrismaListing, 'price'> {
  price: number | null;
}

export interface PriceHistoryResponse extends Omit<PrismaPriceHistory, 'oldPrice' | 'newPrice'> {
  oldPrice: number | null;
  newPrice: number;
}

export interface PaginatedListingsResult {
  data: ListingResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MarketplaceSearchResult {
  query: string;
  data: MarketplaceListingResponse[];
  bySource: {
    ikman: number;
    riyasewana: number;
  };
  errors: string[];
}

export interface MarketplaceListingResponse {
  source: 'ikman' | 'riyasewana';
  sourceListingId: string;
  title: string;
  price: number | null;
  url: string;
  location: string | null;
  mileage: number | null;
  year: number | null;
  imageUrls: string[];
}

@Injectable()
export class ListingsService {
  private readonly prisma = new PrismaClient();

  async getListings(query: GetListingsQuery): Promise<PaginatedListingsResult> {
    const page = this.parsePositiveInt(query.page, 1, 'page');
    const limit = this.parsePositiveInt(query.limit, 20, 'limit');
    const minPrice = this.parseDecimal(query.minPrice, 'minPrice');
    const maxPrice = this.parseDecimal(query.maxPrice, 'maxPrice');
    const minYear = this.parseOptionalPositiveInt(query.minYear, 'minYear');
    const maxMileage = this.parseOptionalPositiveInt(query.maxMileage, 'maxMileage');
    const keyword = query.keyword?.trim();
    const location = query.location?.trim();

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new BadRequestException('minPrice cannot be greater than maxPrice');
    }

    if (minYear !== undefined && (minYear < 1900 || minYear > 2100)) {
      throw new BadRequestException('minYear must be between 1900 and 2100');
    }

    const where: Prisma.ListingWhereInput = {};

    if (keyword) {
      where.title = {
        contains: keyword,
        mode: 'insensitive',
      };
    }

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive',
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (minYear !== undefined) {
      where.year = { gte: minYear };
    }

    if (maxMileage !== undefined) {
      where.mileage = { lte: maxMileage };
    }

    const [rows, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.toListingResponse(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getListingById(id: string): Promise<ListingResponse> {
    this.validateListingId(id);

    const listing = await this.prisma.listing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return this.toListingResponse(listing);
  }

  async getListingHistory(id: string): Promise<PriceHistoryResponse[]> {
    this.validateListingId(id);

    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const history = await this.prisma.priceHistory.findMany({
      where: { listingId: id },
      orderBy: { detectedAt: 'asc' },
    });

    return history.map((item) => this.toPriceHistoryResponse(item));
  }

  async searchAcrossMarketplaces(query: string, limitRaw?: string): Promise<MarketplaceSearchResult> {
    const keyword = query?.trim();
    if (!keyword) {
      throw new BadRequestException('query is required');
    }

    const limit = Math.min(this.parsePositiveInt(limitRaw, 20, 'limit'), 50);
    const [ikmanResult, riyasewanaResult] = await Promise.allSettled([
      this.searchIkman(keyword, limit),
      this.searchRiyasewana(keyword, limit),
    ]);

    const data: MarketplaceListingResponse[] = [];
    const errors: string[] = [];

    if (ikmanResult.status === 'fulfilled') {
      data.push(...ikmanResult.value);
    } else {
      errors.push('Failed to fetch results from ikman.lk');
    }

    if (riyasewanaResult.status === 'fulfilled') {
      data.push(...riyasewanaResult.value);
    } else {
      errors.push('Failed to fetch results from riyasewana.com');
    }

    return {
      query: keyword,
      data,
      bySource: {
        ikman: data.filter((item) => item.source === 'ikman').length,
        riyasewana: data.filter((item) => item.source === 'riyasewana').length,
      },
      errors,
    };
  }

  private validateListingId(id: string): void {
    const trimmedId = id?.trim();
    if (!trimmedId || !/^c[a-z0-9]{24}$/i.test(trimmedId)) {
      throw new BadRequestException('Invalid listing id');
    }
  }

  private parsePositiveInt(value: string | undefined, defaultValue: number, fieldName: string): number {
    if (value === undefined) {
      return defaultValue;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return parsed;
  }

  private parseOptionalPositiveInt(value: string | undefined, fieldName: string): number | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return parsed;
  }

  private parseDecimal(value: string | undefined, fieldName: string): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException(`${fieldName} must be a valid number greater than or equal to 0`);
    }

    return parsed;
  }

  private async searchIkman(query: string, limit: number): Promise<MarketplaceListingResponse[]> {
    const url = `https://ikman.lk/en/ads/sri-lanka/vehicles?sort=relevance&buy_now=0&urgent=0&query=${encodeURIComponent(query)}`;
    const html = await this.fetchHtml(url);
    const marker = 'window.initialData = ';
    const startIndex = html.indexOf(marker);
    if (startIndex === -1) {
      return [];
    }

    const jsonStart = startIndex + marker.length;
    const jsonEnd = html.indexOf('</script>', jsonStart);
    if (jsonEnd === -1) {
      return [];
    }

    const rawJson = html.slice(jsonStart, jsonEnd).trim().replace(/;$/, '');
    type InitialDataAd = {
      slug?: string;
      title?: string;
      description?: string;
      details?: string;
      subtitle?: string;
      price?: string;
      imgUrl?: string;
    };

    let ads: InitialDataAd[] = [];
    try {
      const parsed = JSON.parse(rawJson) as {
        serp?: { ads?: { data?: { ads?: InitialDataAd[] } } };
      };
      ads = parsed.serp?.ads?.data?.ads ?? [];
    } catch {
      ads = [];
    }

    const seen = new Set<string>();
    const listings: MarketplaceListingResponse[] = [];

    for (const ad of ads) {
      if (!ad.slug || !ad.title) continue;
      const listingUrl = `https://ikman.lk/en/ad/${ad.slug}`;
      if (seen.has(listingUrl)) continue;

      const detailsText = [ad.title, ad.details, ad.subtitle].filter(Boolean).join(' ');
      listings.push({
        source: 'ikman',
        sourceListingId: listingUrl,
        title: ad.title.trim(),
        price: this.parseNumberFromText(ad.price) ?? null,
        url: listingUrl,
        location: this.parseLocationFromText(ad.description) ?? null,
        mileage: this.parseMileageFromText(ad.details ?? ad.subtitle ?? '') ?? null,
        year: this.parseYearFromText(detailsText) ?? null,
        imageUrls: ad.imgUrl ? [ad.imgUrl] : [],
      });

      seen.add(listingUrl);
      if (listings.length >= limit) break;
    }

    return listings;
  }

  private async searchRiyasewana(query: string, limit: number): Promise<MarketplaceListingResponse[]> {
    const slug = query
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const url = `https://riyasewana.com/search/${encodeURIComponent(slug)}`;
    const html = await this.fetchHtml(url, true);

    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const listings: MarketplaceListingResponse[] = [];
    const seen = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = scriptRegex.exec(html)) !== null) {
      const scriptContent = match[1]?.trim();
      if (!scriptContent) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(scriptContent);
      } catch {
        continue;
      }

      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;

        const itemListElement = (node as { itemListElement?: unknown }).itemListElement;
        const flattened = Array.isArray(itemListElement) ? itemListElement : [node];

        for (const entry of flattened) {
          if (!entry || typeof entry !== 'object') continue;

          const item = (entry as { item?: unknown }).item;
          const listingNode = item && typeof item === 'object' ? item : entry;
          const maybeUrl = (listingNode as { url?: string }).url;
          const maybeTitle = (listingNode as { name?: string }).name;
          const normalizedUrl = maybeUrl ? this.normalizeRiyasewanaUrl(maybeUrl) : '';

          if (!normalizedUrl.includes('/buy/') || !maybeTitle || seen.has(normalizedUrl)) {
            continue;
          }

          const offers = (listingNode as { offers?: { price?: string | number } }).offers;
          const entryOffers = (entry as { offers?: { price?: string | number } }).offers;
          const areaServed = (listingNode as { areaServed?: { name?: string } }).areaServed;
          const odometer = (listingNode as { mileageFromOdometer?: { value?: string | number } })
            .mileageFromOdometer;
          const modelDate = (listingNode as { vehicleModelDate?: string }).vehicleModelDate;
          const image = (listingNode as { image?: string | string[] }).image;

          const imageUrls = Array.isArray(image)
            ? image
                .map((value) => this.toSafeImageUrl(this.normalizeRiyasewanaUrl(value)))
                .filter((value): value is string => Boolean(value))
            : image
              ? [this.toSafeImageUrl(this.normalizeRiyasewanaUrl(image))].filter(
                  (value): value is string => Boolean(value),
                )
              : [];

          listings.push({
            source: 'riyasewana',
            sourceListingId: normalizedUrl,
            title: maybeTitle.trim(),
            price: this.parseNumberFromText(offers?.price ?? entryOffers?.price) ?? null,
            url: normalizedUrl,
            location: areaServed?.name?.trim() || null,
            mileage: this.parseNumberFromText(odometer?.value) ?? null,
            year: this.parseYearFromText(`${modelDate ?? ''} ${maybeTitle}`) ?? null,
            imageUrls,
          });
          seen.add(normalizedUrl);

          if (listings.length >= limit) {
            return this.fillMissingPricesFromStoredSourceListings('riyasewana', listings);
          }
        }
      }
    }

    if (listings.length > 0) {
      return this.fillMissingPricesFromStoredSourceListings('riyasewana', listings);
    }

    
    const $ = cheerio.load(html);
    const linkElements = $('a[href*="/buy/"]');
    linkElements.each((_, element) => {
      if (listings.length >= limit) return;

      const link = $(element);
      const href = link.attr('href') ?? '';
      if (!/\/buy\/.+-\d+(?:\/)?(?:\?.*)?$/i.test(href)) return;

      const normalizedUrl = this.normalizeRiyasewanaUrl(href);
      if (seen.has(normalizedUrl)) return;

      const title = link.text().trim() || link.attr('title')?.trim();
      if (!title) return;

      const card = this.findRiyasewanaListingContainer($, link);
      const cardText = card.text().replace(/\s+/g, ' ').trim();
      const priceMatch = cardText.match(/(?:Rs\.?|LKR)\s*[\d,.]+/i);
      const image = card.find('img').first();
      const imageSrc = image.attr('src') || image.attr('data-src');
      const safeImage = this.toSafeImageUrl(imageSrc ? this.normalizeRiyasewanaUrl(imageSrc) : undefined);

      listings.push({
        source: 'riyasewana',
        sourceListingId: normalizedUrl,
        title,
        price: this.parseNumberFromText(priceMatch?.[1]) ?? null,
        url: normalizedUrl,
        location: this.parseLocationFromCardText(cardText) ?? null,
        mileage: this.parseMileageFromText(cardText) ?? null,
        year: this.parseYearFromText(cardText) ?? null,
        imageUrls: safeImage ? [safeImage] : [],
      });
      seen.add(normalizedUrl);
    });

    if (listings.length > 0) {
      return this.fillMissingPricesFromStoredSourceListings('riyasewana', listings);
    }

    return this.searchStoredListingsBySource('riyasewana', query, limit);
  }

  private parseYearFromText(text?: string): number | undefined {
    if (!text) return undefined;
    const currentYear = new Date().getFullYear();
    const matches = text.match(/\b(19\d{2}|20\d{2})\b/g);
    if (!matches) return undefined;
    const years = matches
      .map((value) => Number(value))
      .filter((value) => value >= 1950 && value <= currentYear + 1);
    return years.length > 0 ? years[years.length - 1] : undefined;
  }

  private parseMileageFromText(text?: string): number | undefined {
    if (!text) return undefined;
    const match = text.match(/\b(\d{1,3}(?:,\d{3})+|\d{2,7})\s*(km|kms|kilometers|kilometres)\b/i);
    if (!match) return undefined;
    const value = Number(match[1].replace(/,/g, ''));
    if (!Number.isFinite(value) || value < 1 || value > 1_000_000) return undefined;
    return value;
  }

  private parseLocationFromText(text?: string): string | undefined {
    if (!text) return undefined;
    const location = text.split(',')[0]?.trim();
    return location || undefined;
  }

  private parseLocationFromCardText(text?: string): string | undefined {
    if (!text) return undefined;
    const locationMileageMatch = text.match(
      /\b([A-Za-z][A-Za-z\s\-]+)\s*[·|]\s*(\d{1,3}(?:,\d{3})+|\d{2,7})\s*km\b/i,
    );
    if (locationMileageMatch?.[1]) {
      return locationMileageMatch[1].trim();
    }
    const locationOnlyMatch = text.match(/\b([A-Za-z][A-Za-z\s\-]{2,40})\s*(?:·|\|)/);
    return locationOnlyMatch?.[1]?.trim() || undefined;
  }

  private findRiyasewanaListingContainer(
    $: cheerio.CheerioAPI,
    link: cheerio.Cheerio<any>,
  ): cheerio.Cheerio<any> {
    let current = link.parent();
    for (let depth = 0; depth < 7 && current.length > 0; depth++) {
      const text = current.text().replace(/\s+/g, ' ').trim();
      if (/(Rs\.?\s*[\d,.]+|LKR\s*[\d,.]+|Negotiable|\b(19\d{2}|20\d{2})\b)/i.test(text)) {
        return current;
      }
      current = current.parent();
    }

    return link.closest('li, article, .item, .listing, .ad-item, .single-ads, .normalAd, .search-item, div');
  }

  private parseNumberFromText(value?: string | number): number | undefined {
    if (value === undefined || value === null) return undefined;
    const digits = String(value).replace(/[^\d]/g, '');
    if (!digits) return undefined;
    const parsed = Number(digits);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private normalizeRiyasewanaUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('javascript:')) {
      return '';
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('/')) return `https://riyasewana.com${trimmed}`;
    return `https://riyasewana.com/${trimmed}`;
  }

  private toSafeImageUrl(value?: string): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) return undefined;
    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) return undefined;
      return parsed.toString();
    } catch {
      return undefined;
    }
  }

  private async searchStoredListingsBySource(
    source: 'ikman' | 'riyasewana',
    query: string,
    limit: number,
  ): Promise<MarketplaceListingResponse[]> {
    const rows = await this.prisma.listing.findMany({
      where: {
        source,
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    const missingIds = rows.filter((row) => row.price === null).map((row) => row.id);
    const latestPriceByListingId = await this.getLatestPricesForListingIds(missingIds);

    return rows.map((row) => ({
      source,
      sourceListingId: row.sourceListingId,
      title: row.title,
      price:
        row.price === null
          ? latestPriceByListingId.get(row.id) ?? null
          : Number(row.price),
      url: row.url,
      location: row.location,
      mileage: row.mileage,
      year: row.year,
      imageUrls: row.imageUrls
        .map((value) => this.toSafeImageUrl(value))
        .filter((value): value is string => Boolean(value)),
    }));
  }

  private async fillMissingPricesFromStoredSourceListings(
    source: 'ikman' | 'riyasewana',
    listings: MarketplaceListingResponse[],
  ): Promise<MarketplaceListingResponse[]> {
    const missing = listings.filter((item) => item.price === null);
    if (missing.length === 0) return listings;

    const sourceListingIds = Array.from(new Set(missing.map((item) => item.sourceListingId)));
    const rows = await this.prisma.listing.findMany({
      where: {
        source,
        sourceListingId: { in: sourceListingIds },
      },
      select: {
        id: true,
        sourceListingId: true,
        price: true,
      },
    });

    const latestPriceByListingId = await this.getLatestPricesForListingIds(rows.map((row) => row.id));
    const priceBySourceListingId = new Map<string, number>();
    for (const row of rows) {
      const price = row.price === null ? latestPriceByListingId.get(row.id) : Number(row.price);
      if (typeof price === 'number') {
        priceBySourceListingId.set(row.sourceListingId, price);
      }
    }

    return listings.map((item) =>
      item.price !== null
        ? item
        : {
            ...item,
            price: priceBySourceListingId.get(item.sourceListingId) ?? null,
          },
    );
  }

  private async getLatestPricesForListingIds(listingIds: string[]): Promise<Map<string, number>> {
    if (listingIds.length === 0) return new Map<string, number>();

    const historyRows = await this.prisma.priceHistory.findMany({
      where: {
        listingId: { in: listingIds },
      },
      orderBy: [{ listingId: 'asc' }, { detectedAt: 'desc' }],
      select: {
        listingId: true,
        newPrice: true,
      },
    });

    const latestPriceByListingId = new Map<string, number>();
    for (const row of historyRows) {
      if (!latestPriceByListingId.has(row.listingId)) {
        latestPriceByListingId.set(row.listingId, Number(row.newPrice));
      }
    }
    return latestPriceByListingId;
  }

  private async fetchHtml(url: string, preferBrowser = false): Promise<string> {
    if (preferBrowser) {
      return this.fetchHtmlWithBrowser(url);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(url, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        
        if ([401, 403, 429, 503].includes(response.status)) {
          return this.fetchHtmlWithBrowser(url);
        }
        throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
      }

      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchHtmlWithBrowser(url: string): Promise<string> {
    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        locale: 'en-US',
      });
      page.setDefaultNavigationTimeout(90_000);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
      return await page.content();
    } finally {
      await browser.close();
    }
  }

  private toListingResponse(listing: PrismaListing): ListingResponse {
    return {
      ...listing,
      price: listing.price === null ? null : Number(listing.price),
    };
  }

  private toPriceHistoryResponse(item: PrismaPriceHistory): PriceHistoryResponse {
    return {
      ...item,
      oldPrice: item.oldPrice === null ? null : Number(item.oldPrice),
      newPrice: Number(item.newPrice),
    };
  }
}
