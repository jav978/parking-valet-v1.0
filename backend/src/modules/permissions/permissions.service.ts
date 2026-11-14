import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
  }

  async findByModule() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });

    const grouped: Record<string, Array<{ id: string; code: string; name: string; description: string | null }>> = {};

    for (const perm of permissions) {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push({
        id: perm.id,
        code: perm.code,
        name: perm.name,
        description: perm.description,
      });
    }

    return grouped;
  }
}
