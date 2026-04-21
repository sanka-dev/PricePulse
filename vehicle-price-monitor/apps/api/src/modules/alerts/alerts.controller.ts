import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  AlertsService,
  AlertResponse,
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

  @Get()
  findAll(): Promise<AlertResponse[]> {
    return this.alertsService.findAll();
  }

  @Delete(':id')
  deactivate(@Param('id') id: string): Promise<AlertResponse> {
    return this.alertsService.deactivate(id);
  }
}
