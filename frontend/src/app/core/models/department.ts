export interface DepartmentResponse {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentMinimalResponse {
  id: number;
  code: string;
  name: string;
}

