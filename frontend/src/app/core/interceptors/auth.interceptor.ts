import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError, type Observable } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (isPublicUrl(req.url)) return next(req);

  const token = authService.getAccessToken();
  if (token) {
    req = addToken(req, token);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isRefreshing) {
        isRefreshing = true;
        return authService.refreshToken().pipe(
          take(1),
          switchMap((res) => {
            isRefreshing = false;
            return next(addToken(req, res.data.accessToken));
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            authService['clearSession']();
            router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isPublicUrl(url: string): boolean {
  const publicUrls = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];
  return publicUrls.some((u) => url.includes(u));
}
