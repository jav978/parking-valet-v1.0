import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response';

export interface CompanySettings {
  companyName?: string;
  taxId?: string;
  phone?: string;
  address?: string;
  email?: string;
  ticketHeader?: string;
  ticketFooter?: string;
  gracePeriodMinutes?: number;
  currencySymbol?: string;
  taxPercentage?: number;
}

export interface PrinterConfigItem {
  id?: string;
  lotId: string;
  name: string;
  interfaceType: 'USB' | 'NETWORK' | 'SERIAL' | 'BLUETOOTH';
  devicePath?: string;
  ipAddress?: string;
  port?: number;
  paperWidth: 'MM_80' | 'MM_58';
  charactersPerLine?: number;
  isDefault?: boolean;
  isActive?: boolean;
  lot?: { id: string; name: string; code: string };
}

@Injectable({
  providedIn: 'root',
})
export class SettingService {
  private http = inject(HttpClient);
  private apiUrl = '/api/settings';

  getSettings(): Observable<ApiResponse<{ settings: Record<string, any> }>> {
    return this.http.get<ApiResponse<{ settings: Record<string, any> }>>(this.apiUrl);
  }

  updateSettings(settings: Record<string, any>): Observable<ApiResponse<{ settings: Record<string, any> }>> {
    return this.http.patch<ApiResponse<{ settings: Record<string, any> }>>(this.apiUrl, settings);
  }

  getPrinters(lotId?: string): Observable<ApiResponse<PrinterConfigItem[]>> {
    let params = new HttpParams();
    if (lotId) {
      params = params.set('lotId', lotId);
    }
    return this.http.get<ApiResponse<PrinterConfigItem[]>>(`${this.apiUrl}/printers/list`, { params });
  }

  createPrinter(printer: PrinterConfigItem): Observable<ApiResponse<PrinterConfigItem>> {
    return this.http.post<ApiResponse<PrinterConfigItem>>(`${this.apiUrl}/printers`, printer);
  }

  updatePrinter(id: string, printer: Partial<PrinterConfigItem>): Observable<ApiResponse<PrinterConfigItem>> {
    return this.http.patch<ApiResponse<PrinterConfigItem>>(`${this.apiUrl}/printers/${id}`, printer);
  }

  deletePrinter(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/printers/${id}`);
  }
}
