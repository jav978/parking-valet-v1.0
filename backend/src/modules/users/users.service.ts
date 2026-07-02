import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { NotFoundException } from '../../common/exceptions/not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, createdById: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BusinessException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        roleId: dto.roleId,
        isActive: dto.isActive ?? true,
        createdById,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        role: { select: { id: true, name: true } },
        createdAt: true,
      },
    });
  }

  async findAll(filter: UserFilterDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, isActive, roleId } = filter;

    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) where.isActive = isActive;
    if (roleId) where.roleId = roleId;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          role: { select: { id: true, name: true } },
          createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        role: { select: { id: true, name: true, description: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.isActive === false) {
      throw new NotFoundException('User', id);
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, updatedById: string) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        updatedById,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        role: { select: { id: true, name: true } },
        updatedAt: true,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
