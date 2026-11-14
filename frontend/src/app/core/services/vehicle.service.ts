import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Vehicle, CreateVehicleRequest, UpdateVehicleRequest, VehicleFilterParams } from '../interfaces/vehicle';
import { ApiResponse } from '../interfaces/api-response';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private http = inject(HttpClient);
  private apiUrl = '/api/vehicles';

  getVehicles(params?: VehicleFilterParams): Observable<ApiResponse<Vehicle[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<ApiResponse<Vehicle[]>>(this.apiUrl, { params: httpParams });
  }

  getByClient(clientId: string): Observable<ApiResponse<Vehicle[]>> {
    return this.http.get<ApiResponse<Vehicle[]>>(`${this.apiUrl}?clientId=${clientId}`);
  }

  getVehicle(id: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/${id}`);
  }

  createVehicle(request: CreateVehicleRequest): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.apiUrl, request);
  }

  updateVehicle(id: string, request: UpdateVehicleRequest): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${this.apiUrl}/${id}`, request);
  }

  deleteVehicle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
