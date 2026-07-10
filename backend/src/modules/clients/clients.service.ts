import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientFilterDto } from './dto/client-filter.dto';
import { NotFoundException } from '../../common/exceptions/not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientDto, createdById: string) {
    const existingClient = await this.prisma.client.findUnique({
      where: {
        documentType_documentNumber: {
          documentType: dto.documentType,
          documentNumber: dto.documentNumber,
        },
      },
    });

    if (existingClient && !existingClient.deletedAt) {
      throw new BusinessException('Un cliente con ese tipo y número de documento ya está registrado.');
    }

    return this.prisma.client.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        clientType: dto.clientType ?? 'REGULAR',
        notes: dto.notes,
        isActive: dto.isActive ?? true,
        createdById,
      },
    });
  }

  async findAll(filter: ClientFilterDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, isActive, clientType } = filter;

    const where: Prisma.ClientWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) where.isActive = isActive;
    if (clientType) where.clientType = clientType;

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: clients,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
    });

    if (!client) {
      throw new NotFoundException('Client', id);
    }

    return client;
  }

  async update(id: string, dto: UpdateClientDto, updatedById: string) {
    const client = await this.findOne(id);

    if (dto.documentType || dto.documentNumber) {
      const docType = dto.documentType ?? client.documentType;
      const docNum = dto.documentNumber ?? client.documentNumber;

      const existingClient = await this.prisma.client.findFirst({
        where: {
          documentType: docType,
          documentNumber: docNum,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existingClient) {
        throw new BusinessException('Otro cliente con ese tipo y número de documento ya está registrado.');
      }
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        ...dto,
        updatedById,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.client.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}
