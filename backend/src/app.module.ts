import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './common/database/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { ClientsModule } from './modules/clients/clients.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { ParkingLotsModule } from './modules/parking-lots/parking-lots.module';
import { ParkingSpotsModule } from './modules/parking-spots/parking-spots.module';
import { RatesModule } from './modules/rates/rates.module';
import { CashRegistersModule } from './modules/cash-registers/cash-registers.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    TicketsModule,
    ClientsModule,
    VehiclesModule,
    ParkingLotsModule,
    ParkingSpotsModule,
    RatesModule,
    CashRegistersModule,
    PaymentsModule,
    DashboardModule,
    SettingsModule,
    ReportsModule,
  ],
  controllers: [],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}
