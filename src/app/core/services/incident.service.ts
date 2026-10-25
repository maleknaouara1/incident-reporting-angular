import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, PagedResult } from '../models/api-response.model';
import { IncidentDto, IncidentHistoryDto, CreateIncidentRequest } from '../models/incident.model';

@Injectable({
  providedIn: 'root'
})
export class IncidentService {
  private http = inject(HttpClient);

  // The API pages results (max 100 per page); Reporters only receive their own incidents.
  getAll(pageNumber = 1, pageSize = 100): Observable<ApiResponse<PagedResult<IncidentDto>>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);
    return this.http.get<ApiResponse<PagedResult<IncidentDto>>>(`${API_BASE_URL}/api/incidents`, { params });
  }

  getById(id: string): Observable<ApiResponse<IncidentDto>> {
    return this.http.get<ApiResponse<IncidentDto>>(`${API_BASE_URL}/api/incidents/${id}`);
  }

  getTimeline(id: string): Observable<ApiResponse<IncidentHistoryDto[]>> {
    return this.http.get<ApiResponse<IncidentHistoryDto[]>>(`${API_BASE_URL}/api/incidents/${id}/timeline`);
  }

  create(request: CreateIncidentRequest): Observable<ApiResponse<IncidentDto>> {
    return this.http.post<ApiResponse<IncidentDto>>(`${API_BASE_URL}/api/incidents`, request);
  }
}
