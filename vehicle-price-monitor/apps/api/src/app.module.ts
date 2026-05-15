import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './common/supabase';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { PricesModule } from './modules/prices/prices.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ListingsModule } from './modules/listings/listings.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../scraper/.env'],
    }),

    
    SupabaseModule,

   
    AuthModule,
    UsersModule,
    VehiclesModule,
    PricesModule,
    AlertsModule,
    ListingsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
