import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { LicenseService } from '../../modules/license/license.service';

@Injectable()
export class LicenseSystemGuard implements CanActivate {
  constructor(private readonly licenseService: LicenseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const url: string = request.url || '';

    // Allow auth, license status/activation endpoints to execute regardless of license state
    if (
      url.includes('/api/auth') ||
      url.includes('/api/license/status') ||
      url.includes('/api/license/activate') ||
      url.includes('/api/license/toggle-subscription')
    ) {
      return true;
    }

    const status = await this.licenseService.getLicenseStatus();

    if (status.isSubscriptionActive) {
      if (status.status === 'EXPIRED') {
        throw new HttpException(
          {
            statusCode: HttpStatus.LOCKED,
            error: 'Subscription Expired',
            message: 'El sistema se encuentra bloqueado por vencimiento de la suscripción de 30 días.',
            lockType: 'EXPIRED',
          },
          HttpStatus.LOCKED,
        );
      }

      if (status.status === 'TAMPER_LOCKED') {
        throw new HttpException(
          {
            statusCode: HttpStatus.LOCKED,
            error: 'Security Alert: Clock Tampering Detected',
            message: '¡ALERTA DE SEGURIDAD! Se detectó una alteración en la hora del sistema. Operaciones bloqueadas.',
            lockType: 'TAMPER',
          },
          HttpStatus.LOCKED,
        );
      }
    }

    return true;
  }
}
