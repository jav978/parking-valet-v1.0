import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { ParkingLotFilterDto } from './dto/parking-lot-filter.dto';
import { NotFoundException } from '../../common/exceptions/not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class ParkingLotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateParkingLotDto) {
    const existing = await this.prisma.parkingLot.findUnique({
      where: { code: dto.code },
    });
    if (existing && !existing.deletedAt) {
      throw new BusinessException('Ya existe un estacionamiento con ese código');
    }

    if (existing?.deletedAt) {
      return this.prisma.parkingLot.update({
        where: { id: existing.id },
        data: { ...dto, deletedAt: null, isActive: true },
        include: { parkingSpots: true },
      });
    }

    return this.prisma.parkingLot.create({
      data: {
        ...dto,
        totalSpots: dto.totalSpots ?? 0,
        availableSpots: dto.availableSpots ?? dto.totalSpots ?? 0,
      },
      include: { parkingSpots: true },
    });
  }

  async findAll(filter: ParkingLotFilterDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, isActive } = filter;

    const where: Prisma.ParkingLotWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) where.isActive = isActive;

    const allowedSorts = ['name', 'code', 'totalSpots', 'availableSpots', 'createdAt'];
    const orderBy = allowedSorts.includes(sortBy) ? { [sortBy]: sortOrder } : { createdAt: sortOrder };

    const [items, total] = await Promise.all([
      this.prisma.parkingLot.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: { _count: { select: { parkingSpots: true, tickets: true } } },
      }),
      this.prisma.parkingLot.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.parkingLot.findFirst({
      where: { id, deletedAt: null },
      include: {
        parkingSpots: { where: { deletedAt: null }, orderBy: [{ floor: 'asc' }, { spotNumber: 'asc' }] },
        rates: { where: { deletedAt: null, isActive: true } },
      },
    });
    if (!item) throw new NotFoundException('ParkingLot', id);
    return item;
  }

  async update(id: string, dto: UpdateParkingLotDto) {
    await this.findOne(id);

    if (dto.code) {
      const dup = await this.prisma.parkingLot.findUnique({ where: { code: dto.code } });
      if (dup && dup.id !== id && !dup.deletedAt) {
        throw new BusinessException('Ya existe otro estacionamiento con ese código');
      }
    }

    return this.prisma.parkingLot.update({
      where: { id },
      data: dto,
      include: { parkingSpots: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.parkingLot.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
