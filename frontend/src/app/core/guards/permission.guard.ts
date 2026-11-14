import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export function permissionGuard(permission: string): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.hasPermission(permission)) return true;

    router.navigate(['/']);
    return false;
  };
}
