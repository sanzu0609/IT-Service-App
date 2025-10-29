import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '../models/api';
import {
  Priority,
  Ticket,
  TicketComment,
  TicketStatus
} from '../models/ticket';

export interface TicketListParams {
  status?: TicketStatus | string;
  priority?: Priority | string;
  page?: number;
  size?: number;
  sort?: string;
  reporterId?: number;
  assigneeId?: number;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  priority: Priority;
  categoryId?: number;
  assigneeId?: number;
  attachments?: unknown;
}

export interface UpdateTicketPayload {
  subject?: string;
  description?: string;
  priority?: Priority;
  assigneeId?: number | null;
  categoryId?: number | null;
}

export interface AddCommentPayload {
  content: string;
  isInternal: boolean;
}

export interface ChangeStatusPayload {
  toStatus: TicketStatus;
  note?: string;
}

const BASE_URL = '/api/tickets';

@Injectable({ providedIn: 'root' })
export class TicketsService {
  constructor(private readonly http: HttpClient) {}

  list(params: TicketListParams): Observable<Page<Ticket>> {
    const filtered: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      filtered[key] = value as string | number | boolean;
    }

    return this.http.get<Page<Ticket>>(BASE_URL, {
      params: filtered,
      withCredentials: true
    });
  }

  get(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${BASE_URL}/${id}`, {
      withCredentials: true
    });
  }

  create(payload: CreateTicketPayload): Observable<Ticket> {
    return this.http.post<Ticket>(BASE_URL, payload, {
      withCredentials: true
    });
  }

  update(id: number, patch: UpdateTicketPayload): Observable<Ticket> {
    return this.http.patch<Ticket>(`${BASE_URL}/${id}`, patch, {
      withCredentials: true
    });
  }

  listComments(id: number): Observable<TicketComment[]> {
    return this.http.get<TicketComment[]>(`${BASE_URL}/${id}/comments`, {
      withCredentials: true
    });
  }

  addComment(id: number, payload: AddCommentPayload): Observable<TicketComment> {
    return this.http.post<TicketComment>(`${BASE_URL}/${id}/comments`, payload, {
      withCredentials: true
    });
  }

  changeStatus(id: number, payload: ChangeStatusPayload): Observable<Ticket> {
    return this.http.post<Ticket>(`${BASE_URL}/${id}/status`, payload, {
      withCredentials: true
    });
  }
}
