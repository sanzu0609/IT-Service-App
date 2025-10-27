import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, map, tap } from 'rxjs';
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
      .post<MeResponse>('/api/auth/login', payload, { withCredentials: true })
      .pipe(tap(user => (this.meCache = user ?? null)));
  }

  logout() {
    return this.http
      .post<void>('/api/auth/logout', {}, { withCredentials: true })
      .pipe(tap(() => this.clearCache()));
  }

  me() {
    return this.http
      .get<MeResponse>('/api/auth/me', { withCredentials: true })
      .pipe(tap(user => (this.meCache = user ?? null)));
  }

  async ensureMe(): Promise<MeResponse | null> {
    if (this.meCache) {
      return this.meCache;
    }

    try {
      const result = await lastValueFrom(
        this.me().pipe(map(user => user ?? null))
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
