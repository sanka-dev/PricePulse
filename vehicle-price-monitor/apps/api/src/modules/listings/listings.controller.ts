import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  GetListingsQuery,
  ListingsService,
  ListingResponse,
  PaginatedListingsResult,
  PriceHistoryResponse,
} from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  getListings(@Query() query: GetListingsQuery): Promise<PaginatedListingsResult> {
    return this.listingsService.getListings(query);
  }

  @Get(':id')
  getListingById(@Param('id') id: string): Promise<ListingResponse> {
    return this.listingsService.getListingById(id);
  }

  @Get(':id/history')
  getListingHistory(@Param('id') id: string): Promise<PriceHistoryResponse[]> {
    return this.listingsService.getListingHistory(id);
  }
}
