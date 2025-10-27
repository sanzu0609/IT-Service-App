import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '../models/api';
import { Role, User } from '../models/user';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UsersListParams {
  role?: Role;
  active?: boolean;
  page?: number;
  size?: number;
  sort?: string;
  q?: string;
  departmentId?: number;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  role: Role;
  departmentId?: number | null;
  active?: boolean;
  fullName?: string;
}

export type UpdateUserPayload = Partial<{
  email: string;
  role: Role;
  departmentId: number | null;
  active: boolean;
  fullName: string;
}>;

export interface ResetPasswordResponse {
  mustChangePassword: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly http: HttpClient) {}

  list(params: UsersListParams): Observable<Page<User>> {
    return this.http.get<Page<User>>('/api/users', {
      params: toHttpParams(params),
      withCredentials: true
    });
  }

  get(id: number): Observable<User> {
    return this.http.get<User>(`/api/users/${id}`, {
      withCredentials: true
    });
  }

  create(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>('/api/users', payload, {
      withCredentials: true
    });
  }

  update(id: number, payload: UpdateUserPayload): Observable<User> {
    return this.http.patch<User>(`/api/users/${id}`, payload, {
      withCredentials: true
    });
  }

  resetPassword(id: number, tempPassword?: string): Observable<ResetPasswordResponse> {
    const body = tempPassword && tempPassword.trim().length > 0
      ? { tempPassword: tempPassword.trim() }
      : {};

    return this.http.post<ResetPasswordResponse>(`/api/users/${id}/reset-password`, body, {
      withCredentials: true
    });
  }

  changePasswordSelf(payload: ChangePasswordPayload): Observable<void> {
    return this.http.post<void>('/api/users/change-password', payload, {
      withCredentials: true
    });
  }
}

function toHttpParams(params: UsersListParams): Record<string, string> {
  const result: Record<string, string> = {};

  if (params.role) {
    result['role'] = params.role;
  }
  if (params.active !== undefined && params.active !== null) {
    result['active'] = String(params.active);
  }
  if (params.page !== undefined && params.page !== null) {
    result['page'] = String(params.page);
  }
  if (params.size !== undefined && params.size !== null) {
    result['size'] = String(params.size);
  }
  if (params.sort) {
    result['sort'] = params.sort;
  }
  if (params.q) {
    result['q'] = params.q;
  }
  if (params.departmentId !== undefined && params.departmentId !== null) {
    result['departmentId'] = String(params.departmentId);
  }

  return result;
}
