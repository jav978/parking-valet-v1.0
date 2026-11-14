import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { NotFoundException } from '../../common/exceptions/not-found.exception';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllSettings() {
    const settings = await this.prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });

    const result: Record<string, any> = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });

    return {
      settings: result,
      raw: settings,
    };
  }

  async getSettingByKey(key: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException('Setting', key);
    }

    return setting;
  }

  async updateSetting(key: string, value: any, description?: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: {
        value,
        ...(description ? { description } : {}),
      },
      create: {
        key,
        value,
        description,
      },
    });
  }

  async updateBulkSettings(items: Record<string, any>) {
    const updates = Object.entries(items).map(([key, value]) =>
      this.prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    );

    await Promise.all(updates);
    return this.getAllSettings();
  }

  // Impresoras
  async getPrinters(lotId?: string) {
    return this.prisma.printerConfig.findMany({
      where: {
        isActive: true,
        ...(lotId ? { lotId } : {}),
      },
      include: {
        lot: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async createPrinter(data: any, userId?: string) {
    if (data.isDefault) {
      await this.prisma.printerConfig.updateMany({
        where: { lotId: data.lotId },
        data: { isDefault: false },
      });
    }

    return this.prisma.printerConfig.create({
      data: {
        lotId: data.lotId,
        name: data.name,
        interfaceType: data.interfaceType || 'NETWORK',
        devicePath: data.devicePath,
        ipAddress: data.ipAddress,
        port: data.port ? Number(data.port) : 9100,
        paperWidth: data.paperWidth || 'MM_80',
        charactersPerLine: data.charactersPerLine ? Number(data.charactersPerLine) : 42,
        isDefault: data.isDefault ?? false,
        createdById: userId,
      },
    });
  }

  async updatePrinter(id: string, data: any) {
    const existing = await this.prisma.printerConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('PrinterConfig', id);
    }

    if (data.isDefault && existing.lotId) {
      await this.prisma.printerConfig.updateMany({
        where: { lotId: existing.lotId },
        data: { isDefault: false },
      });
    }

    return this.prisma.printerConfig.update({
      where: { id },
      data: {
        name: data.name,
        interfaceType: data.interfaceType,
        devicePath: data.devicePath,
        ipAddress: data.ipAddress,
        port: data.port ? Number(data.port) : undefined,
        paperWidth: data.paperWidth,
        charactersPerLine: data.charactersPerLine ? Number(data.charactersPerLine) : undefined,
        isDefault: data.isDefault,
        isActive: data.isActive,
      },
    });
  }

  async deletePrinter(id: string) {
    const existing = await this.prisma.printerConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('PrinterConfig', id);
    }

    return this.prisma.printerConfig.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
