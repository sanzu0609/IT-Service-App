import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DepartmentMinimalResponse,
  DepartmentResponse
} from '../models/department';
import { Page } from '../models/api';

type ListParams = {
  q?: string;
  active?: boolean;
  page?: number;
  size?: number;
  sort?: string;
};

type DepartmentPayload = {
  code: string;
  name: string;
  description?: string | null;
  active?: boolean;
};

type DepartmentPatch = Partial<DepartmentPayload>;

@Injectable({ providedIn: 'root' })
export class DepartmentsService {
  constructor(private readonly http: HttpClient) {}

  list(params: ListParams): Observable<Page<DepartmentResponse>> {
    const filteredParams: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      filteredParams[key] = value as string | number | boolean;
    }

    return this.http.get<Page<DepartmentResponse>>('/api/departments', {
      params: filteredParams,
      withCredentials: true
    });
  }

  get(id: number): Observable<DepartmentResponse> {
    return this.http.get<DepartmentResponse>(`/api/departments/${id}`, {
      withCredentials: true
    });
  }

  create(payload: DepartmentPayload): Observable<DepartmentResponse> {
    return this.http.post<DepartmentResponse>('/api/departments', payload, {
      withCredentials: true
    });
  }

  update(id: number, patch: DepartmentPatch): Observable<DepartmentResponse> {
    return this.http.patch<DepartmentResponse>(`/api/departments/${id}`, patch, {
      withCredentials: true
    });
  }

  minimal(active = true): Observable<DepartmentMinimalResponse[]> {
    const params =
      active === undefined || active === null
        ? {}
        : { active: String(active) };

    return this.http.get<DepartmentMinimalResponse[]>('/api/departments/minimal', {
      params,
      withCredentials: true
    });
  }
}

