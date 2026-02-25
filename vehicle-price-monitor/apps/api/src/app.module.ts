import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './common/supabase';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { PricesModule } from './modules/prices/prices.module';
import { AlertsModule } from './modules/alerts/alerts.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Supabase
    SupabaseModule,

    // Feature modules
    AuthModule,
    UsersModule,
    VehiclesModule,
    PricesModule,
    AlertsModule,
  ],
})
export class AppModule {}
