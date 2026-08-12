import { Module } from '@nestjs/common';
import { RatesController } from './rates.controller';
import { RatesService } from './rates.service';
import { PrismaService } from '../../common/database/prisma.service';

@Module({
  controllers: [RatesController],
  providers: [RatesService, PrismaService],
  exports: [RatesService],
})
export class RatesModule {}
