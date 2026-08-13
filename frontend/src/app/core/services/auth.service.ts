import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
  LoginRequest,
  LoginResponse,
  UserProfile,
  ChangePasswordRequest,
  ApiResponse,
} from '../interfaces';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_URL = '/api/auth';
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';

  private userSignal = signal<UserProfile | null>(this.getStoredUser());

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly userPermissions = computed(() => this.userSignal()?.permissions ?? []);

  constructor(private http: HttpClient) {}

  login(data: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_URL}/login`, data).pipe(
      tap((res) => {
        this.setSession(res.data);
      })
    );
  }

  register(data: { email: string; password: string; firstName: string; lastName: string; phone?: string }): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_URL}/register`, data).pipe(
      tap((res) => {
        this.setSession(res.data);
      })
    );
  }

  forgotPassword(email: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.post<ApiResponse<{ message: string }>>(`${this.API_URL}/forgot-password`, { email });
  }

  refreshToken(): Observable<ApiResponse<LoginResponse>> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    return this.http
      .post<ApiResponse<LoginResponse>>(
        `${this.API_URL}/refresh`,
        {},
        { headers: { Authorization: `Bearer ${refreshToken}` } }
      )
      .pipe(tap((res) => this.setSession(res.data)));
  }

  logout(): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.API_URL}/logout`, {}).pipe(
      tap(() => this.clearSession())
    );
  }

  getProfile(): Observable<ApiResponse<UserProfile>> {
    return this.http.get<ApiResponse<UserProfile>>(`${this.API_URL}/profile`);
  }

  loadProfile(): void {
    if (!this.getAccessToken()) return;

    this.getProfile().subscribe({
      next: (res) => {
        const current = this.userSignal();
        const roleName = (res.data.role as unknown as { name?: string })?.name;
        this.userSignal.set({
          id: res.data.id,
          email: res.data.email,
          firstName: res.data.firstName,
          lastName: res.data.lastName,
          role: roleName ?? current?.role ?? '',
          permissions: current?.permissions ?? [],
        });
      },
      error: () => {},
    });
  }

  changePassword(data: ChangePasswordRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.API_URL}/change-password`, data);
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(this.REFRESH_KEY);
  }

  hasPermission(permission: string): boolean {
    const u = this.userSignal();
    if (!u) return false;
    const role = typeof u.role === 'string'
      ? u.role.toUpperCase()
      : (u.role as any)?.name?.toUpperCase() || '';
    if (role === 'ADMIN' || role === 'SUPERADMIN') return true;
    return this.userPermissions().includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  private setSession(data: LoginResponse): void {
    sessionStorage.setItem(this.TOKEN_KEY, data.accessToken);
    sessionStorage.setItem(this.REFRESH_KEY, data.refreshToken);
    this.userSignal.set(data.user);
  }

  private clearSession(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_KEY);
    this.userSignal.set(null);
  }

  private getStoredUser(): UserProfile | null {
    const token = sessionStorage.getItem(this.TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = JSON.parse(this.decodeJwtPayload(token));
      // Verificar que el token no haya expirado
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < nowSeconds) {
        sessionStorage.removeItem(this.TOKEN_KEY);
        sessionStorage.removeItem(this.REFRESH_KEY);
        return null;
      }
      return {
        id: payload.sub,
        email: payload.email,
        firstName: payload.firstName || '',
        lastName: payload.lastName || '',
        role: payload.role,
        permissions: payload.permissions || [],
      };
    } catch {
      return null;
    }
  }

  private decodeJwtPayload(token: string): string {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
  }
}
