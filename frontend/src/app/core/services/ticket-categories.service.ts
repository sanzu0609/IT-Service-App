import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TicketCategory {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class TicketCategoriesService {
  constructor(private readonly http: HttpClient) {}

  list(): Observable<TicketCategory[]> {
    return this.http.get<TicketCategory[]>('/api/tickets/categories', {
      withCredentials: true
    });
  }
}
