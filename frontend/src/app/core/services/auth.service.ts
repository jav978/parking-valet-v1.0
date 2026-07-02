import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
  LoginRequest,
  LoginResponse,
  UserProfile,
  RefreshTokenRequest,
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

  register(data: { email: string; password: string; firstName: string; lastName: string; roleId: string }): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_URL}/register`, data).pipe(
      tap((res) => {
        this.setSession(res.data);
      })
    );
  }

  refreshToken(): Observable<ApiResponse<LoginResponse>> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.API_URL}/refresh`, { refreshToken } as RefreshTokenRequest)
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

  changePassword(data: ChangePasswordRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.API_URL}/change-password`, data);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  hasPermission(permission: string): boolean {
    return this.userPermissions().includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  private setSession(data: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, data.accessToken);
    localStorage.setItem(this.REFRESH_KEY, data.refreshToken);
    this.userSignal.set(data.user);
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    this.userSignal.set(null);
  }

  private getStoredUser(): UserProfile | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
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
}
