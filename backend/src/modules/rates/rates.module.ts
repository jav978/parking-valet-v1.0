import { Module } from '@nestjs/common';
import { RatesService } from './rates.service';
import { RatesController } from './rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';
import { PrismaService } from '../../common/database/prisma.service';

@Module({
  controllers: [RatesController],
  providers: [RatesService, ExchangeRatesService, PrismaService],
  exports: [RatesService, ExchangeRatesService],
})
export class RatesModule {}
