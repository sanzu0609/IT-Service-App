import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly http: HttpClient) {}

  changePassword(payload: ChangePasswordPayload) {
    return this.http.post<void>('/api/users/change-password', payload, {
      withCredentials: true
    });
  }
}
