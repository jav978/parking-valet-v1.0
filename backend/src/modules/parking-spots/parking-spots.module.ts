import { Module } from '@nestjs/common';
import { ParkingSpotsController } from './parking-spots.controller';
import { ParkingSpotsService } from './parking-spots.service';
import { PrismaService } from '../../common/database/prisma.service';

@Module({
  controllers: [ParkingSpotsController],
  providers: [ParkingSpotsService, PrismaService],
  exports: [ParkingSpotsService],
})
export class ParkingSpotsModule {}
