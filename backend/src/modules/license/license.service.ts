import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { GenerateLicenseDto } from './dto/generate-license.dto';
import { ActivateLicenseDto } from './dto/activate-license.dto';
import { ToggleSubscriptionDto } from './dto/toggle-subscription.dto';

export interface LicenseStatus {
  isSubscriptionActive: boolean;
  status: 'INACTIVE' | 'ACTIVE' | 'WARNING' | 'EXPIRED' | 'TAMPER_LOCKED';
  daysRemaining: number;
  expiresAt: string | null;
  maskedKey: string | null;
  isClockTampered: boolean;
  message: string;
}

@Injectable()
export class LicenseService {
  private readonly SETTING_KEY = 'subscription_settings';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a 12-char random alphanumeric string formatted as VALET-XXXX-YYYY-ZZZZ
   */
  private generateRandomKeyString(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous 0, O, 1, I
    let raw = '';
    for (let i = 0; i < 12; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      raw += chars[randomIndex];
    }
    return `VALET-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  }

  private hashKey(key: string): string {
    const normalized = key.trim().toUpperCase().replace(/\s+/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Retrieves and calculates current license status with Anti-Clock Rollback verification
   */
  async getLicenseStatus(): Promise<LicenseStatus> {
    const now = Date.now();
    const setting = await this.prisma.setting.findUnique({
      where: { key: this.SETTING_KEY },
    });

    let config = setting?.value as any || {
      isSubscriptionActive: false,
      status: 'INACTIVE',
      expiresAt: null,
      maskedKey: null,
      lastRecordedTimestamp: now,
      isClockTampered: false,
    };

    // Anti-Clock Rollback Guard: Check if system clock was rolled back
    const lastRecorded = config.lastRecordedTimestamp || now;
    let isTampered = config.isClockTampered || false;

    // Compare with latest ticket created_at as reference
    const lastTicket = await this.prisma.ticket.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const latestDbTimestamp = lastTicket ? new Date(lastTicket.createdAt).getTime() : 0;
    const maxKnownTimestamp = Math.max(lastRecorded, latestDbTimestamp);

    // If current time is more than 2 minutes behind known historical timestamp, trigger Anti-Tamper Lock!
    if (now < maxKnownTimestamp - 120000) {
      isTampered = true;
    } else {
      // Update lastRecordedTimestamp to highest known timestamp
      config.lastRecordedTimestamp = Math.max(now, maxKnownTimestamp);
    }

    config.isClockTampered = isTampered;

    let daysRemaining = 0;
    let computedStatus: LicenseStatus['status'] = 'INACTIVE';
    let message = 'Sistema sin restricción de suscripción.';

    if (!config.isSubscriptionActive) {
      computedStatus = 'INACTIVE';
      message = 'Suscripción desactivada por el proveedor. El sistema opera normalmente.';
    } else if (isTampered) {
      computedStatus = 'TAMPER_LOCKED';
      message = '¡ALERTA DE SEGURIDAD! Se detectó una alteración no autorizada en la fecha/hora del sistema. Operaciones suspendidas.';
    } else if (config.expiresAt) {
      const expirationMs = new Date(config.expiresAt).getTime();
      const diffMs = expirationMs - now;
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      if (daysRemaining <= 0) {
        computedStatus = 'EXPIRED';
        message = 'La suscripción del servicio ha expirado. Las operaciones del sistema están bloqueadas.';
      } else if (daysRemaining <= 5) {
        computedStatus = 'WARNING';
        message = `Atención: Su suscripción vencerá en ${daysRemaining} día(s). Comuníquese con el proveedor para renovar.`;
      } else {
        computedStatus = 'ACTIVE';
        message = `Suscripción activa. Restan ${daysRemaining} días de servicio.`;
      }
    }

    config.status = computedStatus;

    // Persist updated settings to DB
    await this.prisma.setting.upsert({
      where: { key: this.SETTING_KEY },
      update: { value: config },
      create: { key: this.SETTING_KEY, value: config, description: 'Configuración de Suscripción y Licencia' },
    });

    return {
      isSubscriptionActive: config.isSubscriptionActive,
      status: computedStatus,
      daysRemaining,
      expiresAt: config.expiresAt,
      maskedKey: config.maskedKey,
      isClockTampered: isTampered,
      message,
    };
  }

  /**
   * Generates a new License Key (Vendor / SuperAdmin)
   */
  async generateLicenseKey(dto: GenerateLicenseDto, userId?: string) {
    const plainKey = this.generateRandomKeyString();
    const keyHash = this.hashKey(plainKey);
    const maskedKey = `${plainKey.slice(0, 10)}****-${plainKey.slice(15)}`;

    const licenseKey = await this.prisma.licenseKey.create({
      data: {
        keyHash,
        maskedKey,
        durationDays: dto.durationDays || 30,
        status: 'UNUSED',
        clientEmail: dto.clientEmail,
        createdById: userId,
      },
    });

    return {
      message: 'Clave de Licencia generada exitosamente.',
      plainKey, // Expose plain text key ONLY upon creation
      licenseKey: {
        id: licenseKey.id,
        maskedKey: licenseKey.maskedKey,
        durationDays: licenseKey.durationDays,
        clientEmail: licenseKey.clientEmail,
        createdAt: licenseKey.createdAt,
      },
    };
  }

  /**
   * Activates a License Key entered by user/client (VALET-XXXX-YYYY-ZZZZ)
   */
  async activateLicenseKey(dto: ActivateLicenseDto, userId?: string) {
    const keyHash = this.hashKey(dto.licenseKey);

    const license = await this.prisma.licenseKey.findUnique({
      where: { keyHash },
    });

    if (!license) {
      throw new BadRequestException('La clave de licencia ingresada es inválida o no existe.');
    }

    if (license.status !== 'UNUSED') {
      throw new BadRequestException('Esta clave de licencia ya ha sido canjeada o no está disponible.');
    }

    const now = new Date();
    const durationMs = (license.durationDays || 30) * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(now.getTime() + durationMs);

    // Update license record
    await this.prisma.licenseKey.update({
      where: { id: license.id },
      data: {
        status: 'ACTIVE',
        activatedAt: now,
        expiresAt,
      },
    });

    // Update system subscription settings
    const currentSettings = await this.getLicenseStatus();
    const updatedConfig = {
      isSubscriptionActive: true,
      status: 'ACTIVE',
      expiresAt: expiresAt.toISOString(),
      maskedKey: license.maskedKey,
      lastRecordedTimestamp: now.getTime(),
      isClockTampered: false,
    };

    await this.prisma.setting.upsert({
      where: { key: this.SETTING_KEY },
      update: { value: updatedConfig },
      create: { key: this.SETTING_KEY, value: updatedConfig, description: 'Configuración de Suscripción y Licencia' },
    });

    return {
      message: `¡Licencia activada exitosamente por ${license.durationDays} días!`,
      expiresAt: expiresAt.toISOString(),
      durationDays: license.durationDays,
    };
  }

  /**
   * Toggles the subscription protection flag (Requires SuperAdmin password)
   */
  async toggleSubscription(dto: ToggleSubscriptionDto, currentUser: any) {
    // Verify password of current user
    const dbUser = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { role: true },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const roleName = dbUser.role?.name?.toUpperCase() || '';
    if (roleName !== 'ADMIN' && roleName !== 'SUPERADMIN') {
      throw new ForbiddenException('Solo un SuperAdministrador o Proveedor puede modificar la bandera de suscripción.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, dbUser.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña incorrecta. Autenticación fallida para el cambio de configuración.');
    }

    const now = Date.now();
    const expiresAt = dto.isActive ? new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString() : null;

    const newConfig = {
      isSubscriptionActive: dto.isActive,
      status: dto.isActive ? 'ACTIVE' : 'INACTIVE',
      expiresAt: expiresAt,
      maskedKey: dto.isActive ? 'VALET-INIT-****-30D' : null,
      lastRecordedTimestamp: now,
      isClockTampered: false,
    };

    await this.prisma.setting.upsert({
      where: { key: this.SETTING_KEY },
      update: { value: newConfig },
      create: { key: this.SETTING_KEY, value: newConfig, description: 'Configuración de Suscripción y Licencia' },
    });

    return {
      message: dto.isActive 
        ? 'Protección de suscripción HABILITADA. Conteo de 30 días iniciado.' 
        : 'Protección de suscripción DESHABILITADA. El sistema operará de forma ilimitada.',
      isSubscriptionActive: dto.isActive,
    };
  }

  /**
   * Lists generated license keys for vendor audit
   */
  async listLicenseKeys() {
    return this.prisma.licenseKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        maskedKey: true,
        durationDays: true,
        status: true,
        clientEmail: true,
        activatedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }
}
