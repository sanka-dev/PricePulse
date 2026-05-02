import { Controller, Get, Query } from '@nestjs/common';
import {
  AlertDemandAnalyticsResponse,
  AlertDemandQuery,
  AnalyticsService,
} from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('alert-demand')
  getAlertDemand(
    @Query() query: AlertDemandQuery,
  ): Promise<AlertDemandAnalyticsResponse> {
    return this.analyticsService.getAlertDemand(query);
  }
}
