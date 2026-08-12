import { Injectable } from '@nestjs/common';
import { Prisma, SpotStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { ParkingLotFilterDto } from './dto/parking-lot-filter.dto';
import { CreateSpotTypeDto } from './dto/create-spot-type.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { NotFoundException } from '../../common/exceptions/not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class ParkingLotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateParkingLotDto, createdById: string) {
    const existing = await this.prisma.parkingLot.findUnique({
      where: { code: dto.code },
    });

    if (existing && !existing.deletedAt) {
      throw new BusinessException(`Ya existe un estacionamiento con el código '${dto.code}'.`);
    }

    const totalSpots = dto.totalSpots ?? 0;

    return this.prisma.parkingLot.create({
      data: {
        name: dto.name,
        code: dto.code,
        address: dto.address,
        city: dto.city,
        phone: dto.phone,
        email: dto.email,
        totalSpots,
        availableSpots: totalSpots,
        openingTime: dto.openingTime,
        closingTime: dto.closingTime,
        is24h: dto.is24h ?? false,
        taxPercentage: dto.taxPercentage ?? 0,
        currency: dto.currency ?? 'VES',
        ticketPrefix: dto.ticketPrefix ?? 'TKT',
        notes: dto.notes,
        isActive: true,
      },
    });
  }

  async findAll(filter: ParkingLotFilterDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      isActive,
      city,
    } = filter;

    const where: Prisma.ParkingLotWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) where.isActive = isActive;
    if (city) where.city = { contains: city, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.parkingLot.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { parkingSpots: true, rates: true },
          },
        },
      }),
      this.prisma.parkingLot.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const lot = await this.prisma.parkingLot.findFirst({
      where: { id, deletedAt: null },
      include: {
        parkingSpots: {
          where: { deletedAt: null },
          include: { spotType: true },
          orderBy: { spotNumber: 'asc' },
        },
        _count: {
          select: { rates: { where: { deletedAt: null, isActive: true } } },
        },
      },
    });

    if (!lot) {
      throw new NotFoundException('ParkingLot', id);
    }

    return lot;
  }

  async update(id: string, dto: UpdateParkingLotDto) {
    const lot = await this.prisma.parkingLot.findFirst({
      where: { id, deletedAt: null },
    });

    if (!lot) {
      throw new NotFoundException('ParkingLot', id);
    }

    if (dto.code && dto.code !== lot.code) {
      const codeExists = await this.prisma.parkingLot.findFirst({
        where: { code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (codeExists) {
        throw new BusinessException(`Ya existe un estacionamiento con el código '${dto.code}'.`);
      }
    }

    // Adjust availableSpots proportionally if totalSpots changes
    let availableSpots: number | undefined;
    if (dto.totalSpots !== undefined && dto.totalSpots !== lot.totalSpots) {
      const occupiedSpots = lot.totalSpots - lot.availableSpots;
      availableSpots = Math.max(0, dto.totalSpots - occupiedSpots);
    }

    return this.prisma.parkingLot.update({
      where: { id },
      data: {
        ...dto,
        ...(availableSpots !== undefined ? { availableSpots } : {}),
      },
    });
  }

  async remove(id: string) {
    const lot = await this.prisma.parkingLot.findFirst({
      where: { id, deletedAt: null },
    });

    if (!lot) {
      throw new NotFoundException('ParkingLot', id);
    }

    await this.prisma.parkingLot.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async getStats(id: string) {
    const lot = await this.prisma.parkingLot.findFirst({
      where: { id, deletedAt: null },
    });

    if (!lot) {
      throw new NotFoundException('ParkingLot', id);
    }

    const activeTickets = await this.prisma.ticket.count({
      where: { lotId: id, status: 'ACTIVE' },
    });

    const occupiedSpots = lot.totalSpots - lot.availableSpots;
    const occupancyPercentage =
      lot.totalSpots > 0
        ? Math.round((occupiedSpots / lot.totalSpots) * 100 * 100) / 100
        : 0;

    return {
      totalSpots: lot.totalSpots,
      availableSpots: lot.availableSpots,
      occupiedSpots,
      occupancyPercentage,
      activeTickets,
    };
  }

  // ─── Spot Types ───────────────────────────────────────────

  async createSpotType(dto: CreateSpotTypeDto) {
    const existing = await this.prisma.spotType.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BusinessException(`Ya existe un tipo de espacio con el código '${dto.code}'.`);
    }

    return this.prisma.spotType.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async findAllSpotTypes() {
    return this.prisma.spotType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // ─── Parking Spots ────────────────────────────────────────

  async createSpot(dto: CreateParkingSpotDto) {
    const lot = await this.prisma.parkingLot.findFirst({
      where: { id: dto.lotId, deletedAt: null },
    });

    if (!lot) {
      throw new NotFoundException('ParkingLot', dto.lotId);
    }

    const spotType = await this.prisma.spotType.findUnique({
      where: { id: dto.spotTypeId },
    });

    if (!spotType) {
      throw new NotFoundException('SpotType', dto.spotTypeId);
    }

    const duplicate = await this.prisma.parkingSpot.findUnique({
      where: { lotId_spotNumber: { lotId: dto.lotId, spotNumber: dto.spotNumber } },
    });

    if (duplicate && !duplicate.deletedAt) {
      throw new BusinessException(
        `Ya existe un espacio con el número '${dto.spotNumber}' en este estacionamiento.`,
      );
    }

    const spot = await this.prisma.parkingSpot.create({
      data: {
        lotId: dto.lotId,
        spotNumber: dto.spotNumber,
        floor: dto.floor ?? 0,
        section: dto.section,
        spotTypeId: dto.spotTypeId,
        status: 'AVAILABLE',
        isActive: true,
      },
      include: { spotType: true },
    });

    // Update lot totalSpots and availableSpots
    await this.prisma.parkingLot.update({
      where: { id: dto.lotId },
      data: {
        totalSpots: { increment: 1 },
        availableSpots: { increment: 1 },
      },
    });

    return spot;
  }

  async findSpots(lotId: string, status?: SpotStatus) {
    const lot = await this.prisma.parkingLot.findFirst({
      where: { id: lotId, deletedAt: null },
    });

    if (!lot) {
      throw new NotFoundException('ParkingLot', lotId);
    }

    const where: Prisma.ParkingSpotWhereInput = { lotId, deletedAt: null };
    if (status) where.status = status;

    return this.prisma.parkingSpot.findMany({
      where,
      include: { spotType: true },
      orderBy: [{ floor: 'asc' }, { spotNumber: 'asc' }],
    });
  }

  async updateSpot(id: string, dto: UpdateParkingSpotDto) {
    const spot = await this.prisma.parkingSpot.findFirst({
      where: { id, deletedAt: null },
    });

    if (!spot) {
      throw new NotFoundException('ParkingSpot', id);
    }

    if (dto.spotNumber && dto.spotNumber !== spot.spotNumber) {
      const lotId = dto.lotId ?? spot.lotId;
      const duplicate = await this.prisma.parkingSpot.findUnique({
        where: { lotId_spotNumber: { lotId, spotNumber: dto.spotNumber } },
      });
      if (duplicate && duplicate.id !== id && !duplicate.deletedAt) {
        throw new BusinessException(
          `Ya existe un espacio con el número '${dto.spotNumber}' en este estacionamiento.`,
        );
      }
    }

    return this.prisma.parkingSpot.update({
      where: { id },
      data: { ...dto },
      include: { spotType: true },
    });
  }

  async removeSpot(id: string) {
    const spot = await this.prisma.parkingSpot.findFirst({
      where: { id, deletedAt: null },
    });

    if (!spot) {
      throw new NotFoundException('ParkingSpot', id);
    }

    if (spot.status === 'OCCUPIED') {
      throw new BusinessException('No se puede eliminar un espacio que está ocupado.');
    }

    await this.prisma.parkingSpot.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Update lot available/total counts
    await this.prisma.parkingLot.update({
      where: { id: spot.lotId },
      data: {
        totalSpots: { decrement: 1 },
        ...(spot.status === 'AVAILABLE' ? { availableSpots: { decrement: 1 } } : {}),
      },
    });
  }
}
