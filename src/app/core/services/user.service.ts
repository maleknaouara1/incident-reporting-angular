import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/api-response.model';
import { UserSummaryDto } from '../models/user.model';
import { UserRole } from './auth.service';

// Every /api/users endpoint is Admin only
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/users`;

  getAll(): Observable<ApiResponse<UserSummaryDto[]>> {
    return this.http.get<ApiResponse<UserSummaryDto[]>>(this.baseUrl);
  }

  changeRole(id: string, role: UserRole): Observable<ApiResponse<UserSummaryDto>> {
    return this.http.put<ApiResponse<UserSummaryDto>>(`${this.baseUrl}/${id}/role`, { role });
  }

  setActive(id: string, isActive: boolean): Observable<ApiResponse<UserSummaryDto>> {
    return this.http.put<ApiResponse<UserSummaryDto>>(`${this.baseUrl}/${id}/status`, { isActive });
  }
}
