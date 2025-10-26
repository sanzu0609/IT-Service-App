export type Role = 'ADMIN' | 'AGENT' | 'END_USER';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  departmentId?: number | null;
  createdAt: string;
}

export type MeResponse = User;
