import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../interfaces/user';
import { ApiResponse } from '../interfaces/api-response';

export interface UserFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  isActive?: boolean;
  roleId?: string;
}

export interface CreateUserRequest {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = '/api/users';

  getUsers(params?: UserFilterParams): Observable<ApiResponse<User[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<ApiResponse<User[]>>(this.apiUrl, { params: httpParams });
  }

  getUser(id: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/${id}`);
  }

  createUser(request: CreateUserRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(this.apiUrl, request);
  }

  updateUser(id: string, request: UpdateUserRequest): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.apiUrl}/${id}`, request);
  }

  deleteUser(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}

