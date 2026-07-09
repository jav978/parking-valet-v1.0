import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../common/database/prisma.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, PrismaService],
  exports: [TicketsService],
})
export class TicketsModule {}
