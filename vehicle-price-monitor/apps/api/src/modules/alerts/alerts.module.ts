import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { GeminiNlpService } from './gemini-nlp.service';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService, GeminiNlpService],
  exports: [AlertsService],
})
export class AlertsModule {}
