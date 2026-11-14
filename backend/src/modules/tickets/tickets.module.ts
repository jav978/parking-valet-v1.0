import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { FareCalculatorService } from './fare-calculator.service';
import { PrismaService } from '../../common/database/prisma.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, FareCalculatorService, PrismaService],
  exports: [TicketsService, FareCalculatorService],
})
export class TicketsModule {}
