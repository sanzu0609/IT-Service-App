import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, map, tap } from 'rxjs';
import { MeResponse } from '../models/user';

/**
 * Interface cho payload đăng nhập
 */
export interface LoginPayload {
  username: string;
  password: string;
}

/**
 * Service quản lý authentication state trong frontend
 * - Xử lý login/logout
 * - Cache thông tin user để tối ưu performance
 * - Tương tác với backend auth APIs
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Cache thông tin user để tránh gọi API nhiều lần
  private meCache: MeResponse | null = null;

  constructor(private readonly http: HttpClient) {}

  /**
   * Đăng nhập user
   * Gửi credentials đến backend và cache response
   */
  login(payload: LoginPayload) {
    return this.http
      .post<MeResponse>('/api/auth/login', payload, { withCredentials: true })
      .pipe(tap(user => (this.meCache = user ?? null)));
  }

  /**
   * Đăng xuất user
   * Gọi API logout và clear cache
   */
  logout() {
    return this.http
      .post<void>('/api/auth/logout', {}, { withCredentials: true })
      .pipe(tap(() => this.clearCache()));
  }

  /**
   * Lấy thông tin user hiện tại từ backend
   * Sử dụng withCredentials để gửi session cookies
   */
  me() {
    return this.http
      .get<MeResponse>('/api/auth/me', { withCredentials: true })
      .pipe(tap(user => (this.meCache = user ?? null)));
  }

  /**
   * Smart method lấy user info: ưu tiên cache, fallback to API
   * Trả về Promise để dễ sử dụng trong guards
   */
  async ensureMe(): Promise<MeResponse | null> {
    if (this.meCache) {
      return this.meCache; // Trả cache nếu có
    }

    try {
      // Gọi API và cache kết quả
      const result = await lastValueFrom(
        this.me().pipe(map(user => user ?? null))
      );
      this.meCache = result;
      return result;
    } catch {
      return null; // Trả null nếu API fail
    }
  }

  /**
   * Clear cache khi logout hoặc session expired
   */
  clearCache(): void {
    this.meCache = null;
  }
}
