import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response';
import { DashboardStats } from '../interfaces/dashboard';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = '/api/dashboard';

  getStats(lotId?: string): Observable<ApiResponse<DashboardStats>> {
    let params = new HttpParams();
    if (lotId) {
      params = params.set('lotId', lotId);
    }
    return this.http.get<ApiResponse<DashboardStats>>(`${this.apiUrl}/stats`, { params });
  }
}
