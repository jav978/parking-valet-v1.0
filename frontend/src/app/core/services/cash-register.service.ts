import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CashRegister,
  OpenCashRegisterRequest,
  CloseCashRegisterRequest,
  CreateMovementRequest,
  CashRegisterMovement,
  CashRegisterFilterParams,
} from '../interfaces/cash-register';
import { ApiResponse } from '../interfaces/api-response';

@Injectable({ providedIn: 'root' })
export class CashRegisterService {
  private http = inject(HttpClient);
  private apiUrl = '/api/cash-registers';

  getActive(lotId?: string): Observable<ApiResponse<CashRegister | null>> {
    let params = new HttpParams();
    if (lotId) params = params.set('lotId', lotId);
    return this.http.get<ApiResponse<CashRegister | null>>(`${this.apiUrl}/active`, { params });
  }

  getCashRegisters(filter?: CashRegisterFilterParams): Observable<ApiResponse<CashRegister[]>> {
    let params = new HttpParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return this.http.get<ApiResponse<CashRegister[]>>(this.apiUrl, { params });
  }

  getCashRegister(id: string): Observable<ApiResponse<CashRegister>> {
    return this.http.get<ApiResponse<CashRegister>>(`${this.apiUrl}/${id}`);
  }

  open(request: OpenCashRegisterRequest): Observable<ApiResponse<CashRegister>> {
    return this.http.post<ApiResponse<CashRegister>>(`${this.apiUrl}/open`, request);
  }

  close(id: string, request: CloseCashRegisterRequest): Observable<ApiResponse<CashRegister>> {
    return this.http.post<ApiResponse<CashRegister>>(`${this.apiUrl}/${id}/close`, request);
  }

  addMovement(id: string, request: CreateMovementRequest): Observable<ApiResponse<CashRegisterMovement>> {
    return this.http.post<ApiResponse<CashRegisterMovement>>(`${this.apiUrl}/${id}/movements`, request);
  }
}
