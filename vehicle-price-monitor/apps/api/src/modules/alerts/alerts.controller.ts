import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import {
  AlertsService,
  AlertLiveUpdateResponse,
  AlertLiveUpdatesQuery,
  AlertResponse,
  CreateAlertFromDescriptionInput,
  CreateAlertInput,
  NlpParseInput,
  NlpParseResult,
} from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  create(@Body() body: CreateAlertInput): Promise<AlertResponse> {
    return this.alertsService.create(body);
  }

  @Post('nlp')
  parseNlp(@Body() body: NlpParseInput): Promise<NlpParseResult> {
    return this.alertsService.parseNlp(body);
  }

  @Post('from-description')
  createFromDescription(@Body() body: CreateAlertFromDescriptionInput): Promise<AlertResponse> {
    return this.alertsService.createFromDescription(body);
  }

  @Get()
  findAll(): Promise<AlertResponse[]> {
    return this.alertsService.findAll();
  }

  @Get('live-updates')
  getLiveUpdates(@Query() query: AlertLiveUpdatesQuery): Promise<AlertLiveUpdateResponse[]> {
    return this.alertsService.getLiveUpdates(query);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string): Promise<AlertResponse> {
    return this.alertsService.deactivate(id);
  }
}
