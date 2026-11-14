import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Payment,
  CreatePaymentRequest,
  PaymentFilterParams,
  PaginatedPayments,
} from '../interfaces/payment';
import { ApiResponse } from '../interfaces/api-response';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = '/api/payments';

  getPayments(filter?: PaymentFilterParams): Observable<ApiResponse<PaginatedPayments>> {
    let params = new HttpParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return this.http.get<ApiResponse<PaginatedPayments>>(this.apiUrl, { params });
  }

  getPayment(id: string): Observable<ApiResponse<Payment>> {
    return this.http.get<ApiResponse<Payment>>(`${this.apiUrl}/${id}`);
  }

  getPaymentsByTicket(ticketId: string): Observable<ApiResponse<Payment[]>> {
    return this.http.get<ApiResponse<Payment[]>>(`${this.apiUrl}/ticket/${ticketId}`);
  }

  create(request: CreatePaymentRequest): Observable<ApiResponse<Payment>> {
    return this.http.post<ApiResponse<Payment>>(this.apiUrl, request);
  }

  delete(id: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.apiUrl}/${id}`);
  }
}
