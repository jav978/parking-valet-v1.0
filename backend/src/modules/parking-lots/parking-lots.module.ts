import { Module } from '@nestjs/common';
import { ParkingLotsController } from './parking-lots.controller';
import { ParkingLotsService } from './parking-lots.service';
import { PrismaService } from '../../common/database/prisma.service';

@Module({
  controllers: [ParkingLotsController],
  providers: [ParkingLotsService, PrismaService],
  exports: [ParkingLotsService],
})
export class ParkingLotsModule {}
