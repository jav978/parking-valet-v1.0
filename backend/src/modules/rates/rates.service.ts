import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { RateFilterDto } from './dto/rate-filter.dto';
import { NotFoundException } from '../../common/exceptions/not-found.exception';

@Injectable()
export class RatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRateDto) {
    const lot = await this.prisma.parkingLot.findUnique({ where: { id: dto.lotId } });
    if (!lot || lot.deletedAt) throw new NotFoundException('ParkingLot', dto.lotId);

    const spotType = await this.prisma.spotType.findUnique({ where: { id: dto.spotTypeId } });
    if (!spotType) throw new NotFoundException('SpotType', dto.spotTypeId);

    return this.prisma.rate.create({
      data: {
        ...dto,
        isActive: dto.isActive ?? true,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
      include: { lot: true, spotType: true },
    });
  }

  async findAll(filter: RateFilterDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', lotId, spotTypeId, rateType, isActive } = filter;

    const where: Prisma.RateWhereInput = { deletedAt: null };

    if (lotId) where.lotId = lotId;
    if (spotTypeId) where.spotTypeId = spotTypeId;
    if (rateType) where.rateType = rateType;
    if (isActive !== undefined) where.isActive = isActive;

    const allowedSorts = ['name', 'rateType', 'baseAmount', 'createdAt'];
    const orderBy = allowedSorts.includes(sortBy) ? { [sortBy]: sortOrder } : { createdAt: sortOrder };

    const [items, total] = await Promise.all([
      this.prisma.rate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: { lot: true, spotType: true },
      }),
      this.prisma.rate.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.rate.findFirst({
      where: { id, deletedAt: null },
      include: { lot: true, spotType: true },
    });
    if (!item) throw new NotFoundException('Rate', id);
    return item;
  }

  async update(id: string, dto: UpdateRateDto) {
    await this.findOne(id);

    return this.prisma.rate.update({
      where: { id },
      data: {
        ...dto,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
      include: { lot: true, spotType: true },
    });
  }

  async getSpotTypes() {
    return this.prisma.spotType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.rate.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
