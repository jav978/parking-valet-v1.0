import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { NotFoundException } from '../../common/exceptions/not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new BusinessException(`Role '${dto.name}' already exists`);
    }

    return this.prisma.role.create({ data: dto });
  }

  async findAll() {
    return this.prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        _count: { select: { users: true } },
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
        rolePermissions: {
          include: { permission: { select: { id: true, code: true, name: true, module: true } } },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role', id);
    }

    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.findOne(id);

    return this.prisma.role.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BusinessException('Cannot delete system role');
    }

    if (role._count.users > 0) {
      throw new BusinessException('Cannot delete role with assigned users');
    }

    await this.prisma.role.delete({ where: { id } });
  }

  async getPermissions(roleId: string) {
    await this.findOne(roleId);

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: {
          select: { id: true, code: true, name: true, module: true },
        },
      },
    });

    return rolePermissions.map((rp) => rp.permission);
  }

  async assignPermissions(roleId: string, permissionIds: string[]) {
    await this.findOne(roleId);

    // Remove existing permissions
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });

    // Assign new permissions
    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    }

    return this.getPermissions(roleId);
  }
}
