import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Role, Permission } from '../interfaces/user';
import { ApiResponse } from '../interfaces/api-response';

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private http = inject(HttpClient);
  private apiUrl = '/api/roles';

  getRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(this.apiUrl);
  }

  getRole(id: string): Observable<ApiResponse<Role>> {
    return this.http.get<ApiResponse<Role>>(`${this.apiUrl}/${id}`);
  }

  createRole(request: CreateRoleRequest): Observable<ApiResponse<Role>> {
    return this.http.post<ApiResponse<Role>>(this.apiUrl, request);
  }

  updateRole(id: string, request: UpdateRoleRequest): Observable<ApiResponse<Role>> {
    return this.http.patch<ApiResponse<Role>>(`${this.apiUrl}/${id}`, request);
  }

  deleteRole(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  getRolePermissions(id: string): Observable<ApiResponse<Permission[]>> {
    return this.http.get<ApiResponse<Permission[]>>(`${this.apiUrl}/${id}/permissions`);
  }

  assignRolePermissions(id: string, permissionIds: string[]): Observable<ApiResponse<Permission[]>> {
    return this.http.post<ApiResponse<Permission[]>>(`${this.apiUrl}/${id}/permissions`, { permissionIds });
  }
}
