import { Injectable } from '@nestjs/common';
import { Prisma, RateType } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { RateFilterDto } from './dto/rate-filter.dto';
import { CalculateRateDto } from './dto/calculate-rate.dto';
import { NotFoundException } from '../../common/exceptions/not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class RatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRateDto) {
    const lot = await this.prisma.parkingLot.findFirst({
      where: { id: dto.lotId, deletedAt: null },
    });
    if (!lot) throw new NotFoundException('ParkingLot', dto.lotId);

    const spotType = await this.prisma.spotType.findUnique({
      where: { id: dto.spotTypeId },
    });
    if (!spotType) throw new NotFoundException('SpotType', dto.spotTypeId);

    return this.prisma.rate.create({
      data: {
        lotId: dto.lotId,
        spotTypeId: dto.spotTypeId,
        name: dto.name,
        rateType: dto.rateType,
        baseAmount: dto.baseAmount,
        fractionalMinutes: dto.fractionalMinutes,
        fractionalRate: dto.fractionalRate,
        dailyMax: dto.dailyMax,
        nightRate: dto.nightRate,
        monthlyRate: dto.monthlyRate,
        isActive: dto.isActive ?? true,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
      include: { lot: true, spotType: true },
    });
  }

  async findAll(filter: RateFilterDto) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      lotId,
      spotTypeId,
      rateType,
      isActive,
    } = filter;

    const where: Prisma.RateWhereInput = { deletedAt: null };

    if (lotId) where.lotId = lotId;
    if (spotTypeId) where.spotTypeId = spotTypeId;
    if (rateType) where.rateType = rateType;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      this.prisma.rate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
    const rate = await this.prisma.rate.findFirst({
      where: { id, deletedAt: null },
      include: { lot: true, spotType: true },
    });

    if (!rate) {
      throw new NotFoundException('Rate', id);
    }

    return rate;
  }

  async update(id: string, dto: UpdateRateDto) {
    await this.findOne(id);

    if (dto.lotId) {
      const lot = await this.prisma.parkingLot.findFirst({
        where: { id: dto.lotId, deletedAt: null },
      });
      if (!lot) throw new NotFoundException('ParkingLot', dto.lotId);
    }

    if (dto.spotTypeId) {
      const spotType = await this.prisma.spotType.findUnique({
        where: { id: dto.spotTypeId },
      });
      if (!spotType) throw new NotFoundException('SpotType', dto.spotTypeId);
    }

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

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.rate.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async calculateAmount(dto: CalculateRateDto) {
    const rate = await this.prisma.rate.findFirst({
      where: { id: dto.rateId, deletedAt: null },
      include: { lot: true },
    });

    if (!rate) {
      throw new NotFoundException('Rate', dto.rateId);
    }

    if (!rate.isActive) {
      throw new BusinessException('La tarifa seleccionada no está activa.');
    }

    const baseAmount = Number(rate.baseAmount);
    const durationMinutes = dto.durationMinutes;
    const discountAmount = dto.discountAmount ?? 0;
    let calculatedBase = 0;

    switch (rate.rateType as RateType) {
      case 'HOURLY': {
        // Charge full hours rounding up
        const hours = Math.ceil(durationMinutes / 60);
        calculatedBase = hours * baseAmount;
        break;
      }

      case 'HALF_HOURLY': {
        // Charge full half-hours rounding up
        const halfHours = Math.ceil(durationMinutes / 30);
        calculatedBase = halfHours * baseAmount;
        break;
      }

      case 'FRACTIONAL': {
        const fractionalMins = rate.fractionalMinutes ?? 15;
        const fractionalRate = rate.fractionalRate ? Number(rate.fractionalRate) : baseAmount;
        const fractions = Math.floor(durationMinutes / fractionalMins);
        const raw = fractions * fractionalRate;
        // Minimum is baseAmount
        calculatedBase = Math.max(baseAmount, raw);
        // Apply dailyMax cap if defined
        if (rate.dailyMax) {
          calculatedBase = Math.min(calculatedBase, Number(rate.dailyMax));
        }
        break;
      }

      case 'DAILY': {
        // Flat rate per day
        const days = Math.ceil(durationMinutes / (60 * 24));
        calculatedBase = days * baseAmount;
        break;
      }

      case 'NIGHTLY': {
        // Use nightRate if provided, otherwise baseAmount
        calculatedBase = rate.nightRate ? Number(rate.nightRate) : baseAmount;
        break;
      }

      case 'MONTHLY': {
        // Use monthlyRate if provided, otherwise baseAmount
        calculatedBase = rate.monthlyRate ? Number(rate.monthlyRate) : baseAmount;
        break;
      }

      case 'SPECIAL': {
        // Flat fee
        calculatedBase = baseAmount;
        break;
      }

      default:
        calculatedBase = baseAmount;
    }

    const taxPercentage = Number(rate.lot.taxPercentage);
    const amountAfterDiscount = Math.max(0, calculatedBase - discountAmount);
    const taxAmount = Math.round((amountAfterDiscount * taxPercentage) / 100 * 100) / 100;
    const totalAmount = Math.round((amountAfterDiscount + taxAmount) * 100) / 100;

    return {
      baseAmount: Math.round(calculatedBase * 100) / 100,
      discountAmount,
      taxAmount,
      totalAmount,
      durationMinutes,
      rateUsed: {
        id: rate.id,
        name: rate.name,
        rateType: rate.rateType,
      },
    };
  }

  async findActiveForLot(lotId: string) {
    const lot = await this.prisma.parkingLot.findFirst({
      where: { id: lotId, deletedAt: null },
    });

    if (!lot) {
      throw new NotFoundException('ParkingLot', lotId);
    }

    return this.prisma.rate.findMany({
      where: {
        lotId,
        isActive: true,
        deletedAt: null,
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } },
        ],
      },
      include: { spotType: true },
      orderBy: [{ rateType: 'asc' }, { name: 'asc' }],
    });
  }
}
