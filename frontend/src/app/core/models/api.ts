export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
