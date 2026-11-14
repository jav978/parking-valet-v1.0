import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { ParkingSpotFilterDto } from './dto/parking-spot-filter.dto';
import { NotFoundException } from '../../common/exceptions/not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ParkingMapGateway } from '../../common/events/parking-map.gateway';

@Injectable()
export class ParkingSpotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parkingMapGateway: ParkingMapGateway,
  ) {}

  async create(dto: CreateParkingSpotDto) {
    const lot = await this.prisma.parkingLot.findUnique({ where: { id: dto.lotId } });
    if (!lot || lot.deletedAt) throw new NotFoundException('ParkingLot', dto.lotId);

    const spotType = await this.prisma.spotType.findUnique({ where: { id: dto.spotTypeId } });
    if (!spotType) throw new NotFoundException('SpotType', dto.spotTypeId);

    const duplicate = await this.prisma.parkingSpot.findFirst({
      where: { lotId: dto.lotId, spotNumber: dto.spotNumber, deletedAt: null },
    });
    if (duplicate) {
      throw new BusinessException('Ya existe un espacio con ese número en este estacionamiento');
    }

    const spot = await this.prisma.parkingSpot.create({
      data: { ...dto, status: dto.status ?? 'AVAILABLE' },
      include: { lot: true, spotType: true },
    });

    await this.prisma.parkingLot.update({
      where: { id: dto.lotId },
      data: { totalSpots: { increment: 1 } },
    });

    await this.parkingMapGateway.emitSpotUpdate(spot.id);
    return spot;
  }

  async findAll(filter: ParkingSpotFilterDto) {
    const { page = 1, limit = 10, sortBy = 'floor', sortOrder = 'asc', lotId, spotTypeId, status } = filter;

    const where: Prisma.ParkingSpotWhereInput = { deletedAt: null };

    if (lotId) where.lotId = lotId;
    if (spotTypeId) where.spotTypeId = spotTypeId;
    if (status) where.status = status;

    const allowedSorts = ['spotNumber', 'floor', 'section', 'status', 'createdAt'];
    const orderBy = allowedSorts.includes(sortBy) ? { [sortBy]: sortOrder } : { floor: sortOrder };

    const [items, total] = await Promise.all([
      this.prisma.parkingSpot.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: { lot: true, spotType: true },
      }),
      this.prisma.parkingSpot.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.parkingSpot.findFirst({
      where: { id, deletedAt: null },
      include: { lot: true, spotType: true },
    });
    if (!item) throw new NotFoundException('ParkingSpot', id);
    return item;
  }

  async update(id: string, dto: UpdateParkingSpotDto) {
    await this.findOne(id);

    if (dto.lotId && dto.spotNumber) {
      const dup = await this.prisma.parkingSpot.findFirst({
        where: { lotId: dto.lotId, spotNumber: dto.spotNumber, deletedAt: null },
      });
      if (dup && dup.id !== id) {
        throw new BusinessException('Ya existe un espacio con ese número en este estacionamiento');
      }
    }

    const updated = await this.prisma.parkingSpot.update({
      where: { id },
      data: dto,
      include: { lot: true, spotType: true },
    });

    await this.parkingMapGateway.emitSpotUpdate(id);
    return updated;
  }

  async remove(id: string) {
    const spot = await this.findOne(id);
    await this.prisma.parkingSpot.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.prisma.parkingLot.update({
      where: { id: spot.lotId },
      data: { totalSpots: { decrement: 1 } },
    });
  }

  async getMap(lotId?: string) {
    const where: Prisma.ParkingSpotWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(lotId ? { lotId } : {}),
    };

    const spots = await this.prisma.parkingSpot.findMany({
      where,
      orderBy: [{ floor: 'asc' }, { spotNumber: 'asc' }],
      include: {
        lot: { select: { id: true, name: true, code: true, taxPercentage: true } },
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

    const now = Date.now();

    const formattedSpots = spots.map((s) => {
      const activeTicket = s.tickets && s.tickets.length > 0 ? s.tickets[0] : null;
      let ticketInfo: any = null;

      if (activeTicket) {
        const entryDate = new Date(activeTicket.entryTime);
        const minutesInside = Math.max(1, Math.round((now - entryDate.getTime()) / 60000));
        const baseAmount = activeTicket.rate?.baseAmount ? Number(activeTicket.rate.baseAmount) : 5.0;

        ticketInfo = {
          id: activeTicket.id,
          ticketNumber: activeTicket.ticketNumber,
          plateNumber: activeTicket.plateNumber,
          entryTime: activeTicket.entryTime,
          minutesInside,
          baseAmount,
          client: activeTicket.client
            ? {
                name: `${activeTicket.client.firstName} ${activeTicket.client.lastName}`,
                document: `${activeTicket.client.documentType || 'V'}-${activeTicket.client.documentNumber}`,
                phone: activeTicket.client.phone,
              }
            : null,
          vehicle: activeTicket.vehicle
            ? {
                brand: activeTicket.vehicle.brand,
                model: activeTicket.vehicle.model,
                color: activeTicket.vehicle.color,
                type: activeTicket.vehicle.vehicleType,
              }
            : null,
        };
      }

      const floorLabel = s.floor !== undefined && s.floor !== null ? (s.floor < 0 ? `Sótano ${Math.abs(s.floor)}` : s.floor === 0 ? 'Planta Baja' : `Piso ${s.floor}`) : 'Nivel Principal';

      return {
        id: s.id,
        lotId: s.lotId,
        lotName: s.lot?.name || 'Estacionamiento',
        spotNumber: s.spotNumber,
        floor: s.floor,
        floorLabel,
        section: s.section,
        status: s.status,
        spotType: s.spotType ? { id: s.spotType.id, code: s.spotType.code, name: s.spotType.name } : null,
        activeTicket: ticketInfo,
      };
    });

    const total = formattedSpots.length;
    const occupied = formattedSpots.filter((s) => s.status === 'OCCUPIED' || s.activeTicket).length;
    const available = Math.max(0, total - occupied);

    // Group by floorLabel
    const floorGroupsMap = new Map<string, typeof formattedSpots>();
    formattedSpots.forEach((s) => {
      const list = floorGroupsMap.get(s.floorLabel) || [];
      list.push(s);
      floorGroupsMap.set(s.floorLabel, list);
    });

    const floors = Array.from(floorGroupsMap.entries()).map(([label, spotsList]) => ({
      floorLabel: label,
      spots: spotsList,
      total: spotsList.length,
      available: spotsList.filter((s) => s.status === 'AVAILABLE' && !s.activeTicket).length,
      occupied: spotsList.filter((s) => s.status === 'OCCUPIED' || s.activeTicket).length,
    }));

    return {
      summary: { total, available, occupied },
      floors,
      spots: formattedSpots,
    };
  }

  async generateBatch(dto: {
    lotId: string;
    floor: number;
    prefix: string;
    startNumber: number;
    count: number;
    spotTypeId: string;
  }) {
    const lot = await this.prisma.parkingLot.findUnique({ where: { id: dto.lotId } });
    if (!lot) throw new NotFoundException('ParkingLot', dto.lotId);

    const spotType = await this.prisma.spotType.findUnique({ where: { id: dto.spotTypeId } });
    if (!spotType) throw new NotFoundException('SpotType', dto.spotTypeId);

    const createdSpots: any[] = [];

    for (let i = 0; i < dto.count; i++) {
      const num = dto.startNumber + i;
      const spotNumber = `${dto.prefix}-${String(num).padStart(2, '0')}`;

      const existing = await this.prisma.parkingSpot.findFirst({
        where: { lotId: dto.lotId, spotNumber, deletedAt: null },
      });

      if (!existing) {
        const spot = await this.prisma.parkingSpot.create({
          data: {
            lotId: dto.lotId,
            spotNumber,
            floor: dto.floor,
            section: dto.prefix,
            spotTypeId: dto.spotTypeId,
            status: 'AVAILABLE',
            isActive: true,
          },
        });
        createdSpots.push(spot);
      }
    }

    await this.prisma.parkingLot.update({
      where: { id: dto.lotId },
      data: { totalSpots: { increment: createdSpots.length } },
    });

    return {
      message: `Se crearon ${createdSpots.length} puestos exitosamente`,
      createdCount: createdSpots.length,
    };
  }
}
