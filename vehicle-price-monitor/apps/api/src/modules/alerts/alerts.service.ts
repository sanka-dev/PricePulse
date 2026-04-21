import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Alert as PrismaAlert, PrismaClient } from '@prisma/client';
import { GeminiNlpService } from './gemini-nlp.service';

export interface CreateAlertInput {
  keyword?: unknown;
  minYear?: unknown;
  maxPrice?: unknown;
  maxMileage?: unknown;
  location?: unknown;
}

export interface AlertResponse {
  id: string;
  keyword: string | null;
  minYear: number | null;
  maxPrice: number | null;
  maxMileage: number | null;
  location: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface NlpParseInput {
  text?: unknown;
}

export interface NlpParseResult {
  keyword: string | null;
  minYear: number | null;
  maxPrice: number | null;
  maxMileage: number | null;
}

@Injectable()
export class AlertsService {
  private readonly prisma = new PrismaClient();
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly geminiNlp: GeminiNlpService) {}

  async create(input: CreateAlertInput): Promise<AlertResponse> {
    const keyword = this.parseOptionalString(input.keyword, 'keyword');
    const location = this.parseOptionalString(input.location, 'location');
    const minYear = this.parsePositiveInt(input.minYear, 'minYear');
    const maxMileage = this.parsePositiveInt(input.maxMileage, 'maxMileage');
    const maxPrice = this.parsePositiveNumber(input.maxPrice, 'maxPrice');

    if (!keyword && minYear === undefined && maxPrice === undefined && maxMileage === undefined && !location) {
      throw new BadRequestException('At least one filter field is required');
    }

    if (minYear !== undefined && (minYear < 1900 || minYear > 2100)) {
      throw new BadRequestException('minYear must be between 1900 and 2100');
    }

    const alert = await this.prisma.alert.create({
      data: {
        keyword: keyword ?? null,
        minYear: minYear ?? null,
        maxPrice: maxPrice ?? null,
        maxMileage: maxMileage ?? null,
        location: location ?? null,
      },
    });

    return this.toResponse(alert);
  }

  async findAll(): Promise<AlertResponse[]> {
    const alerts = await this.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map((a) => this.toResponse(a));
  }

  async parseNlp(input: NlpParseInput): Promise<NlpParseResult> {
    if (typeof input?.text !== 'string' || input.text.trim().length === 0) {
      throw new BadRequestException('text must be a non-empty string');
    }

    try {
      return await this.geminiNlp.parseAlert(input.text);
    } catch (err) {
      this.logger.warn(
        `Gemini NLP failed, falling back to regex parser: ${(err as Error)?.message ?? err}`,
      );
      return this.parseNlpWithRegex(input.text);
    }
  }

  private parseNlpWithRegex(text: string): NlpParseResult {
    let working = ` ${text.toLowerCase()} `;

    const mileage = this.extractMaxMileage(working);
    working = mileage.remaining;

    const price = this.extractMaxPrice(working);
    working = price.remaining;

    const year = this.extractMinYear(working);
    working = year.remaining;

    return {
      keyword: this.extractKeyword(working),
      minYear: year.value,
      maxPrice: price.value,
      maxMileage: mileage.value,
    };
  }

  async deactivate(id: string): Promise<AlertResponse> {
    this.validateId(id);

    const existing = await this.prisma.alert.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Alert not found');
    }

    const updated = await this.prisma.alert.update({
      where: { id },
      data: { isActive: false },
    });

    return this.toResponse(updated);
  }

  private validateId(id: string): void {
    const trimmed = id?.trim();
    if (!trimmed || !/^c[a-z0-9]{24}$/i.test(trimmed)) {
      throw new BadRequestException('Invalid alert id');
    }
  }

  private parseOptionalString(value: unknown, field: string): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }

  private parsePositiveInt(value: unknown, field: string): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }
    return parsed;
  }

  private parsePositiveNumber(value: unknown, field: string): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`${field} must be a positive number`);
    }
    return parsed;
  }

  // Matches: "under 50000 km", "below 50k km", "less than 100,000 kilometers", "50000 mileage"
  private readonly MILEAGE_REGEX =
    /(?:(?:below|under|less\s+than|max(?:imum)?|up\s+to|at\s+most)\s+)?(\d[\d,.]*)\s*(k)?\s*(?:km|kms|kilometers?|mileage)\b/;

  private extractMaxMileage(text: string): { value: number | null; remaining: string } {
    const match = text.match(this.MILEAGE_REGEX);
    if (!match) return { value: null, remaining: text };

    const base = this.toNumber(match[1]);
    if (base === null) return { value: null, remaining: text };

    const value = match[2] ? base * 1000 : base;
    return { value, remaining: text.replace(match[0], ' ') };
  }

  // Price signals: modifier + number (+unit), currency prefix + number, or number + unit.
  private readonly PRICE_PATTERNS: RegExp[] = [
    /(?:below|under|less\s+than|max(?:imum)?|up\s+to|at\s+most)\s+(?:rs\.?|lkr|\$)\s*(\d[\d,.]*)\s*(million|mn|lakh|lakhs|crore|crores|m|k)?/,
    /(?:below|under|less\s+than|max(?:imum)?|up\s+to|at\s+most)\s+(\d[\d,.]*)\s*(million|mn|lakh|lakhs|crore|crores|m|k)/,
    /(?:rs\.?|lkr|\$)\s*(\d[\d,.]*)\s*(million|mn|lakh|lakhs|crore|crores|m|k)?/,
    /(\d[\d,.]*)\s*(million|mn|lakh|lakhs|crore|crores)/,
  ];

  private extractMaxPrice(text: string): { value: number | null; remaining: string } {
    for (const pattern of this.PRICE_PATTERNS) {
      const match = text.match(pattern);
      if (!match) continue;

      const base = this.toNumber(match[1]);
      if (base === null) continue;

      const value = base * this.priceMultiplier(match[2]);
      return { value, remaining: text.replace(match[0], ' ') };
    }
    return { value: null, remaining: text };
  }

  private priceMultiplier(unit?: string): number {
    switch ((unit ?? '').toLowerCase()) {
      case 'million':
      case 'mn':
      case 'm':
        return 1_000_000;
      case 'lakh':
      case 'lakhs':
        return 100_000;
      case 'crore':
      case 'crores':
        return 10_000_000;
      case 'k':
        return 1_000;
      default:
        return 1;
    }
  }

  // Year signals: "2018 or newer", "after 2018", or a standalone 4-digit year.
  private readonly YEAR_PATTERNS: RegExp[] = [
    /(19\d{2}|20\d{2})\s*(?:or\s+(?:newer|later|above)|and\s+(?:up|above|newer)|\+)/,
    /(?:after|from|since|newer\s+than)\s+(19\d{2}|20\d{2})/,
    /\b(19\d{2}|20\d{2})\b/,
  ];

  private extractMinYear(text: string): { value: number | null; remaining: string } {
    for (const pattern of this.YEAR_PATTERNS) {
      const match = text.match(pattern);
      if (!match) continue;

      const year = Number(match[1]);
      if (Number.isInteger(year) && year >= 1900 && year <= 2100) {
        return { value: year, remaining: text.replace(match[0], ' ') };
      }
    }
    return { value: null, remaining: text };
  }

  private readonly NLP_NOISE_WORDS = new Set([
    'i', 'want', 'a', 'an', 'the', 'looking', 'for', 'show', 'me',
    'with', 'and', 'or', 'please', 'need', 'find', 'under', 'below',
    'less', 'than', 'max', 'maximum', 'min', 'minimum', 'at', 'most',
    'up', 'to', 'newer', 'older', 'from', 'after', 'since', 'before',
    'between', 'rs', 'lkr', 'is', 'any', 'car', 'cars', 'vehicle', 'vehicles',
  ]);

  private extractKeyword(text: string): string | null {
    const tokens = text
      .replace(/[^a-z0-9\s-]/gi, ' ')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !this.NLP_NOISE_WORDS.has(t) && !/^\d+$/.test(t));

    return tokens.length > 0 ? tokens.join(' ') : null;
  }

  private toNumber(raw: string): number | null {
    const n = Number(raw.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  private toResponse(alert: PrismaAlert): AlertResponse {
    return {
      id: alert.id,
      keyword: alert.keyword,
      minYear: alert.minYear,
      maxPrice: alert.maxPrice === null ? null : Number(alert.maxPrice),
      maxMileage: alert.maxMileage,
      location: alert.location,
      isActive: alert.isActive,
      createdAt: alert.createdAt,
    };
  }
}
