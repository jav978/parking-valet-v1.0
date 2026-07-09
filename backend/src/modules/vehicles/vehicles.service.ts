import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleFilterDto } from './dto/vehicle-filter.dto';
import { NotFoundException } from '../../common/exceptions/not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVehicleDto, createdById: string) {
    const existing = await this.prisma.vehicle.findUnique({
      where: { plateNumber: dto.plateNumber },
    });

    if (existing && !existing.deletedAt) {
      throw new BusinessException('Ya existe un vehículo registrado con esa placa');
    }

    if (existing?.deletedAt) {
      return this.prisma.vehicle.update({
        where: { id: existing.id },
        data: { ...dto, deletedAt: null, isActive: true, createdAt: new Date() },
        include: { client: true },
      });
    }

    return this.prisma.vehicle.create({
      data: { ...dto },
      include: { client: true },
    });
  }

  async findAll(filter: VehicleFilterDto) {
    const {
      page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc',
      search, clientId, vehicleType, isActive, clientName,
    } = filter;

    const where: Prisma.VehicleWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { plateNumber: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (clientId) where.clientId = clientId;
    if (vehicleType) where.vehicleType = vehicleType;
    if (isActive !== undefined) where.isActive = isActive;

    if (clientName) {
      where.client = {
        OR: [
          { firstName: { contains: clientName, mode: 'insensitive' } },
          { lastName: { contains: clientName, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { client: true },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.vehicle.findFirst({
      where: { id, deletedAt: null },
      include: { client: true },
    });
    if (!item) throw new NotFoundException('Vehicle', id);
    return item;
  }

  async findByPlate(plate: string) {
    return this.prisma.vehicle.findFirst({
      where: { plateNumber: plate, deletedAt: null },
      include: { client: true },
    });
  }

  async findByClient(clientId: string) {
    return this.prisma.vehicle.findMany({
      where: { clientId, deletedAt: null, isActive: true },
      include: { client: true },
    });
  }

  async update(id: string, dto: UpdateVehicleDto, updatedById: string) {
    await this.findOne(id);

    if (dto.plateNumber) {
      const dup = await this.prisma.vehicle.findUnique({
        where: { plateNumber: dto.plateNumber },
      });
      if (dup && dup.id !== id && !dup.deletedAt) {
        throw new BusinessException('Ya existe otro vehículo con esa placa');
      }
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: dto,
      include: { client: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
