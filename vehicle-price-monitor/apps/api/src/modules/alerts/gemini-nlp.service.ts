import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ParsedAlertFilters {
  keyword: string | null;
  minYear: number | null;
  maxPrice: number | null;
  maxMileage: number | null;
}

@Injectable()
export class GeminiNlpService implements OnModuleInit {
  private readonly logger = new Logger(GeminiNlpService.name);
  private readonly MODEL_NAME = 'gemini-2.0-flash';
  private client: GoogleGenerativeAI | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ??
      this.configService.get<string>('GOOGLE_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set; natural-language alert parsing will be unavailable',
      );
      return;
    }

    this.client = new GoogleGenerativeAI(apiKey);
  }

  async parseAlert(text: string): Promise<ParsedAlertFilters> {
    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (!trimmed) {
      throw new BadRequestException('text must be a non-empty string');
    }

    if (!this.client) {
      throw new InternalServerErrorException(
        'NLP provider is not configured',
      );
    }

    const model = this.client.getGenerativeModel({
      model: this.MODEL_NAME,
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            keyword: { type: SchemaType.STRING, nullable: true },
            minYear: { type: SchemaType.INTEGER, nullable: true },
            maxPrice: { type: SchemaType.NUMBER, nullable: true },
            maxMileage: { type: SchemaType.INTEGER, nullable: true },
          },
        },
      },
    });

    const raw = await this.callModel(model, trimmed);
    return this.parseResponse(raw);
  }

  private async callModel(
    model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
    userText: string,
  ): Promise<string> {
    const prompt = this.buildPrompt(userText);
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      this.logger.error(
        `Gemini request failed: ${(err as Error)?.message ?? err}`,
      );
      throw new BadGatewayException('Failed to reach NLP provider');
    }
  }

  private buildPrompt(userText: string): string {
    return [
      'You extract vehicle search filters from a user request.',
      'Return ONLY a JSON object with exactly these four fields:',
      '- keyword: lowercase vehicle make/model (e.g. "toyota aqua"), or null if unclear.',
      '- minYear: 4-digit integer year the vehicle must be at least, or null.',
      '- maxPrice: number in LKR. Expand units: million=1000000, lakh=100000, crore=10000000, k=1000. Do not include currency or unit text. Null if not mentioned.',
      '- maxMileage: integer kilometers. Expand "k" as 1000. Null if not mentioned.',
      'Use null for any field the user did not specify. Do not add other fields. Do not wrap the JSON in code fences or prose.',
      '',
      'User request:',
      `"""${userText}"""`,
    ].join('\n');
  }

  private parseResponse(raw: string): ParsedAlertFilters {
    const cleaned = this.stripCodeFences(raw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      this.logger.error(`NLP provider returned non-JSON response: ${raw}`);
      throw new BadGatewayException('NLP provider returned invalid JSON');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadGatewayException('NLP provider returned unexpected payload');
    }

    const record = parsed as Record<string, unknown>;
    return {
      keyword: this.normalizeString(record.keyword),
      minYear: this.normalizeYear(record.minYear),
      maxPrice: this.normalizePositiveNumber(record.maxPrice),
      maxMileage: this.normalizePositiveInteger(record.maxMileage),
    };
  }

  // Defensive: Gemini usually respects responseMimeType: 'application/json',
  // but if it slips in a ```json fence we strip it before JSON.parse.
  private stripCodeFences(raw: string): string {
    return raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/, '')
      .trim();
  }

  private normalizeString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeYear(value: unknown): number | null {
    const n = this.toNumber(value);
    if (n === null || !Number.isInteger(n) || n < 1900 || n > 2100) {
      return null;
    }
    return n;
  }

  private normalizePositiveNumber(value: unknown): number | null {
    const n = this.toNumber(value);
    if (n === null || !Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  private normalizePositiveInteger(value: unknown): number | null {
    const n = this.toNumber(value);
    if (n === null || !Number.isInteger(n) || n <= 0) return null;
    return n;
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const n = Number(value.replace(/,/g, '').trim());
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }
}
