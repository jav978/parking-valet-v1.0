import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  parkingLotId?: string;
  groupBy?: 'day' | 'week' | 'month';
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private http = inject(HttpClient);
  private apiUrl = '/api/reports';

  private buildParams(filter?: ReportFilter): HttpParams {
    let params = new HttpParams();
    if (!filter) return params;

    if (filter.startDate) params = params.set('startDate', filter.startDate);
    if (filter.endDate) params = params.set('endDate', filter.endDate);
    if (filter.parkingLotId) params = params.set('parkingLotId', filter.parkingLotId);
    if (filter.groupBy) params = params.set('groupBy', filter.groupBy);

    return params;
  }

  getRevenueReport(filter?: ReportFilter): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/revenue`, { params: this.buildParams(filter) });
  }

  getVehiclesReport(filter?: ReportFilter): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/vehicles`, { params: this.buildParams(filter) });
  }

  getClientsReport(filter?: ReportFilter): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/clients`, { params: this.buildParams(filter) });
  }

  getOccupancyReport(filter?: ReportFilter): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/occupancy`, { params: this.buildParams(filter) });
  }

  getOperatorsReport(filter?: ReportFilter): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/operators`, { params: this.buildParams(filter) });
  }

  exportCsv(filter?: ReportFilter, type: string = 'revenue'): Observable<Blob> {
    const params = this.buildParams(filter).set('type', type);
    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob',
    });
  }
}
