import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { LicenseService } from '../services/license.service';
import { catchError, map, of } from 'rxjs';

export const subscriptionGuard: CanActivateFn = () => {
  const licenseService = inject(LicenseService);
  const router = inject(Router);

  return licenseService.getStatus().pipe(
    map((status) => {
      if (status.isSubscriptionActive) {
        if (status.status === 'EXPIRED' || status.status === 'TAMPER_LOCKED') {
          router.navigate(['/licencia-vencida']);
          return false;
        }
      }
      return true;
    }),
    catchError(() => of(true))
  );
};
