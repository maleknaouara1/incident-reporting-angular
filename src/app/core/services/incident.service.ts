import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, PagedResult } from '../models/api-response.model';
import {
  IncidentDto,
  IncidentHistoryDto,
  CreateIncidentRequest,
  IncidentQuery,
  IncidentStatus
} from '../models/incident.model';

@Injectable({
  providedIn: 'root'
})
export class IncidentService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/incidents`;

  // The API pages results (max 100 per page); Reporters only receive their own incidents.
  getAll(query: IncidentQuery = {}): Observable<ApiResponse<PagedResult<IncidentDto>>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, value);
      }
    }
    return this.http.get<ApiResponse<PagedResult<IncidentDto>>>(this.baseUrl, { params });
  }

  getById(id: string): Observable<ApiResponse<IncidentDto>> {
    return this.http.get<ApiResponse<IncidentDto>>(`${this.baseUrl}/${id}`);
  }

  getTimeline(id: string): Observable<ApiResponse<IncidentHistoryDto[]>> {
    return this.http.get<ApiResponse<IncidentHistoryDto[]>>(`${this.baseUrl}/${id}/timeline`);
  }

  create(request: CreateIncidentRequest): Observable<ApiResponse<IncidentDto>> {
    return this.http.post<ApiResponse<IncidentDto>>(this.baseUrl, request);
  }

  // Staff only: assigning also moves the incident to "Assigned"
  assign(id: string, assignedToUserId: string): Observable<ApiResponse<IncidentDto>> {
    return this.http.put<ApiResponse<IncidentDto>>(`${this.baseUrl}/${id}/assign`, { assignedToUserId });
  }

  // Staff only: the API accepts New→Assigned→InProgress→Resolved→Closed, one step at a time
  updateStatus(id: string, status: IncidentStatus): Observable<ApiResponse<IncidentDto>> {
    return this.http.put<ApiResponse<IncidentDto>>(`${this.baseUrl}/${id}/status`, { status });
  }

  // Staff only; the API records the signed-in user as the author
  addComment(id: string, message: string): Observable<ApiResponse<IncidentDto>> {
    return this.http.post<ApiResponse<IncidentDto>>(`${this.baseUrl}/${id}/comments`, { message });
  }
}
