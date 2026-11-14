import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Permission } from '../interfaces/user';
import { ApiResponse } from '../interfaces/api-response';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private http = inject(HttpClient);
  private apiUrl = '/api/permissions';

  getPermissions(): Observable<ApiResponse<Permission[]>> {
    return this.http.get<ApiResponse<Permission[]>>(this.apiUrl);
  }
}
