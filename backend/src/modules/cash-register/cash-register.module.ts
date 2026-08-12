import { Module } from '@nestjs/common';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { PrismaService } from '../../common/database/prisma.service';

@Module({
  controllers: [CashRegisterController],
  providers: [CashRegisterService, PrismaService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
