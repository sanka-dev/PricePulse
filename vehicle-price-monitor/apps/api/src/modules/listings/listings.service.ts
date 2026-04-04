import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Listing as PrismaListing, PriceHistory as PrismaPriceHistory, Prisma, PrismaClient } from '@prisma/client';

export interface GetListingsQuery {
  page?: string;
  limit?: string;
  minPrice?: string;
  maxPrice?: string;
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

@Injectable()
export class ListingsService {
  private readonly prisma = new PrismaClient();

  async getListings(query: GetListingsQuery): Promise<PaginatedListingsResult> {
    const page = this.parsePositiveInt(query.page, 1, 'page');
    const limit = this.parsePositiveInt(query.limit, 20, 'limit');
    const minPrice = this.parseDecimal(query.minPrice, 'minPrice');
    const maxPrice = this.parseDecimal(query.maxPrice, 'maxPrice');
    const location = query.location?.trim();

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new BadRequestException('minPrice cannot be greater than maxPrice');
    }

    const where: Prisma.ListingWhereInput = {};

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive',
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
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
