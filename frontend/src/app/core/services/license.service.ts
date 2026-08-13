import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';

export interface LicenseStatusResponse {
  isSubscriptionActive: boolean;
  status: 'INACTIVE' | 'ACTIVE' | 'WARNING' | 'EXPIRED' | 'TAMPER_LOCKED';
  daysRemaining: number;
  expiresAt: string | null;
  maskedKey: string | null;
  isClockTampered: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class LicenseService {
  private http = inject(HttpClient);
  private apiUrl = '/api/license';

  licenseStatus = signal<LicenseStatusResponse | null>(null);

  getStatus(): Observable<LicenseStatusResponse> {
    return this.http.get<{ success: boolean; data: LicenseStatusResponse }>(`${this.apiUrl}/status`).pipe(
      map((res) => res.data),
      tap((status) => this.licenseStatus.set(status))
    );
  }

  activateLicense(licenseKey: string): Observable<any> {
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/activate`, { licenseKey }).pipe(
      map((res) => res.data),
      tap(() => this.getStatus().subscribe())
    );
  }

  generateLicenseKey(durationDays: number = 30, clientEmail?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate`, { durationDays, clientEmail });
  }

  toggleSubscription(isActive: boolean, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/toggle-subscription`, { isActive, password }).pipe(
      tap(() => this.getStatus().subscribe())
    );
  }

  getKeys(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/keys`);
  }
}
