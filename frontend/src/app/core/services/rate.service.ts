import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Rate, SpotType, CreateRateRequest, UpdateRateRequest, RateFilterParams } from '../interfaces/rate';
import { ApiResponse } from '../interfaces/api-response';

@Injectable({
  providedIn: 'root'
})
export class RateService {
  private http = inject(HttpClient);
  private apiUrl = '/api/rates';

  getRates(params?: RateFilterParams): Observable<ApiResponse<Rate[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<ApiResponse<Rate[]>>(this.apiUrl, { params: httpParams });
  }

  getRate(id: string): Observable<ApiResponse<Rate>> {
    return this.http.get<ApiResponse<Rate>>(`${this.apiUrl}/${id}`);
  }

  getSpotTypes(): Observable<SpotType[]> {
    return this.http.get<SpotType[]>(`${this.apiUrl}/spot-types`);
  }

  createRate(request: CreateRateRequest): Observable<ApiResponse<Rate>> {
    return this.http.post<ApiResponse<Rate>>(this.apiUrl, request);
  }

  updateRate(id: string, request: UpdateRateRequest): Observable<ApiResponse<Rate>> {
    return this.http.patch<ApiResponse<Rate>>(`${this.apiUrl}/${id}`, request);
  }

  deleteRate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
