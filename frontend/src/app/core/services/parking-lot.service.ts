import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ParkingLot, CreateParkingLotRequest, UpdateParkingLotRequest, ParkingLotFilterParams } from '../interfaces/parking-lot';
import { ApiResponse } from '../interfaces/api-response';

@Injectable({
  providedIn: 'root'
})
export class ParkingLotService {
  private http = inject(HttpClient);
  private apiUrl = '/api/parking-lots';

  getParkingLots(params?: ParkingLotFilterParams): Observable<ApiResponse<ParkingLot[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<ApiResponse<ParkingLot[]>>(this.apiUrl, { params: httpParams });
  }

  getParkingLot(id: string): Observable<ApiResponse<ParkingLot>> {
    return this.http.get<ApiResponse<ParkingLot>>(`${this.apiUrl}/${id}`);
  }

  createParkingLot(request: CreateParkingLotRequest): Observable<ApiResponse<ParkingLot>> {
    return this.http.post<ApiResponse<ParkingLot>>(this.apiUrl, request);
  }

  updateParkingLot(id: string, request: UpdateParkingLotRequest): Observable<ApiResponse<ParkingLot>> {
    return this.http.patch<ApiResponse<ParkingLot>>(`${this.apiUrl}/${id}`, request);
  }

  deleteParkingLot(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
