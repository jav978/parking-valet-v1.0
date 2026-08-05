import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { ParkingSpotFilterDto } from './dto/parking-spot-filter.dto';
import { NotFoundException } from '../../common/exceptions/not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class ParkingSpotsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.parkingSpot.update({
      where: { id },
      data: dto,
      include: { lot: true, spotType: true },
    });
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
}
