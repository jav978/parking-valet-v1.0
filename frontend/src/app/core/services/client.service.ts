import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client, CreateClientRequest, UpdateClientRequest, ClientFilterParams } from '../interfaces/client';
import { ApiResponse } from '../interfaces/api-response';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private http = inject(HttpClient);
  private apiUrl = '/api/clients';

  getClients(params?: ClientFilterParams): Observable<ApiResponse<Client[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<ApiResponse<Client[]>>(this.apiUrl, { params: httpParams });
  }

  getClient(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`);
  }

  createClient(request: CreateClientRequest): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, request);
  }

  updateClient(id: string, request: UpdateClientRequest): Observable<Client> {
    return this.http.patch<Client>(`${this.apiUrl}/${id}`, request);
  }

  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
