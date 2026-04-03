import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PricesService } from './prices.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthenticatedUser {
  id: string;
  email: string;
}

@Controller()
@UseGuards(AuthGuard('supabase'))
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Get('prices/vehicle/:vehicleId')
  getHistory(
    @Param('vehicleId') vehicleId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    return this.pricesService.getHistory(
      vehicleId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit,
    );
  }

  @Get('prices/stats')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.pricesService.getStats(user.id);
  }

  @Get('listings/:id/history')
  getListingHistory(@Param('id') listingId: string) {
    return this.pricesService.getListingHistory(listingId);
  }
}
