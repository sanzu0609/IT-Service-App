import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api';
import { MeResponse } from '../models/user';

export interface LoginPayload {
  username: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private meCache: MeResponse | null = null;

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginPayload) {
    return this.http
      .post<ApiResponse<MeResponse>>('/api/auth/login', payload, { withCredentials: true })
      .pipe(tap(response => (this.meCache = response.data ?? null)));
  }

  logout() {
    return this.http
      .post<void>('/api/auth/logout', {}, { withCredentials: true })
      .pipe(tap(() => this.clearCache()));
  }

  me() {
    return this.http
      .get<ApiResponse<MeResponse>>('/api/auth/me', { withCredentials: true })
      .pipe(tap(response => (this.meCache = response.data ?? null)));
  }

  async ensureMe(): Promise<MeResponse | null> {
    if (this.meCache) {
      return this.meCache;
    }

    try {
      const result = await lastValueFrom(
        this.me().pipe(map(response => response.data ?? null))
      );
      this.meCache = result;
      return result;
    } catch {
      return null;
    }
  }

  clearCache(): void {
    this.meCache = null;
  }
}
