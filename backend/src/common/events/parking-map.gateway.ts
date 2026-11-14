import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../database/prisma.service';

const roomFor = (lotId: string | null | undefined) => `lot:${lotId || 'all'}`;

/**
 * Gateway WebSocket del mapa de puestos en tiempo real.
 * Los clientes se suscriben a una sala por lote y reciben el estado
 * actualizado de cada puesto cuando ocurre una mutación.
 */
@WebSocketGateway({
  namespace: 'mapa',
  cors: { origin: true, credentials: false },
})
export class ParkingMapGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ParkingMapGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(client: Socket) {
    this.logger.debug(`Cliente conectado al mapa: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Cliente desconectado del mapa: ${client.id}`);
  }

  /** El cliente indica a qué lote se suscribe. */
  @SubscribeMessage('join')
  async handleJoin(client: Socket, data: { lotId?: string }) {
    // Salir de cualquier sala de lote previa y unirse a la nueva.
    for (const room of client.rooms) {
      if (typeof room === 'string' && room.startsWith('lot:')) {
        client.leave(room);
      }
    }
    const room = roomFor(data?.lotId);
    client.join(room);

    // Estado inicial inmediato al suscribirse.
    const payload = await this.buildSnapshot(data?.lotId ?? null);
    client.emit('mapa:snapshot', payload);
    return { room };
  }

  @SubscribeMessage('leave')
  handleLeave(client: Socket, data: { lotId?: string }) {
    client.leave(roomFor(data?.lotId));
    return { left: true };
  }

  /**
   * Notifica a la sala del lote el estado nuevo de un puesto.
   * Llamar DESPUÉS de commitear la transacción que originó el cambio.
   */
  async emitSpotUpdate(spotId: string) {
    if (!this.server) return;
    const payload = await this.buildSpotPayload(spotId);
    if (!payload) return;
    this.server.to(roomFor(payload.lotId)).emit('mapa:puesto', payload);
  }

  /**
   * Payload de un puesto con su ticket activo, con el mismo formato que
   * GET /parking-spots/map para que el frontend use un solo shape.
   */
  async buildSpotPayload(spotId: string) {
    const spot = await this.prisma.parkingSpot.findFirst({
      where: { id: spotId, deletedAt: null, isActive: true },
      include: {
        spotType: { select: { id: true, code: true, name: true } },
        tickets: {
          where: { status: 'ACTIVE', deletedAt: null },
          orderBy: { entryTime: 'desc' },
          take: 1,
          include: {
            client: { select: { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true, phone: true } },
            vehicle: { select: { id: true, brand: true, model: true, color: true, plateNumber: true, vehicleType: true } },
            rate: { select: { id: true, name: true, baseAmount: true } },
          },
        },
      },
    });
    if (!spot) return null;

    const activeTicket = spot.tickets?.[0] ?? null;
    const now = Date.now();
    const floorLabel =
      spot.floor !== undefined && spot.floor !== null
        ? spot.floor < 0
          ? `Sótano ${Math.abs(spot.floor)}`
          : spot.floor === 0
            ? 'Planta Baja'
            : `Piso ${spot.floor}`
        : 'Nivel Principal';

    return {
      id: spot.id,
      lotId: spot.lotId,
      spotNumber: spot.spotNumber,
      floor: spot.floor,
      floorLabel,
      section: spot.section,
      status: spot.status,
      spotType: spot.spotType,
      activeTicket: activeTicket
        ? {
            id: activeTicket.id,
            ticketNumber: activeTicket.ticketNumber,
            plateNumber: activeTicket.plateNumber,
            entryTime: activeTicket.entryTime,
            minutesInside: Math.max(1, Math.round((now - new Date(activeTicket.entryTime).getTime()) / 60000)),
            baseAmount: activeTicket.rate?.baseAmount ? Number(activeTicket.rate.baseAmount) : null,
            client: activeTicket.client
              ? { name: `${activeTicket.client.firstName} ${activeTicket.client.lastName}`, document: `${activeTicket.client.documentType || 'V'}-${activeTicket.client.documentNumber}`, phone: activeTicket.client.phone }
              : null,
            vehicle: activeTicket.vehicle
              ? { brand: activeTicket.vehicle.brand, model: activeTicket.vehicle.model, color: activeTicket.vehicle.color, type: activeTicket.vehicle.vehicleType }
              : null,
          }
        : null,
      updatedAt: new Date().toISOString(),
    };
  }

  private async buildSnapshot(lotId: string | null) {
    const spots = await this.prisma.parkingSpot.findMany({
      where: { isActive: true, deletedAt: null, ...(lotId ? { lotId } : {}) },
      orderBy: [{ floor: 'asc' }, { spotNumber: 'asc' }],
      select: { id: true },
    });
    const payloads = await Promise.all(spots.map((s) => this.buildSpotPayload(s.id)));
    return { lotId, spots: payloads.filter(Boolean) };
  }
}
