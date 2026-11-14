import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ParkingMapGateway } from './parking-map.gateway';

/** Módulo global: cualquier servicio puede emitir eventos del mapa. */
@Global()
@Module({
  providers: [ParkingMapGateway, PrismaService],
  exports: [ParkingMapGateway],
})
export class EventsModule {}
