import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TicketCategory } from '../models/ticket';

export interface TicketCategoryOption {
  code: TicketCategory;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class TicketCategoriesService {
  constructor(private readonly http: HttpClient) {}

  list(): Observable<TicketCategoryOption[]> {
    return this.http.get<TicketCategoryOption[]>('/api/tickets/categories', {
      withCredentials: true
    });
  }
}
