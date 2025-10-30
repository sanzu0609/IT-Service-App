import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Page } from '../models/api';
import {
  Priority,
  Ticket,
  TicketCategory,
  TicketComment,
  TicketUserRef,
  SlaFlag,
  TicketStatus,
  TicketSummary
} from '../models/ticket';

export interface TicketListParams {
  status?: TicketStatus | string;
  priority?: Priority | string;
  page?: number;
  size?: number;
  sort?: string;
  reporterId?: number;
  assigneeId?: number;
  search?: string;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  priority: Priority;
  category: TicketCategory;
  attachments?: unknown;
}

export interface UpdateTicketPayload {
  subject?: string;
  description?: string;
  priority?: Priority;
  assigneeId?: number | null;
  category?: TicketCategory;
}

export interface AddCommentPayload {
  content: string;
  isInternal: boolean;
}

export interface ChangeStatusPayload {
  toStatus: TicketStatus;
  note?: string;
  holdReason?: string;
}

const BASE_URL = '/api/tickets';

@Injectable({ providedIn: 'root' })
export class TicketsService {
  constructor(private readonly http: HttpClient) {}

  list(params: TicketListParams = {}): Observable<Page<TicketSummary>> {
    const filtered: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      filtered[key] = value as string | number | boolean;
    }

    return this.http.get<Page<TicketSummary>>(BASE_URL, {
      params: filtered,
      withCredentials: true
    });
  }

  get(id: number): Observable<Ticket> {
    return this.http
      .get<TicketDetailResponseDto>(`${BASE_URL}/${id}`, {
        withCredentials: true
      })
      .pipe(map(mapTicketDetailResponse));
  }

  create(payload: CreateTicketPayload): Observable<Ticket> {
    return this.http.post<Ticket>(BASE_URL, payload, {
      withCredentials: true
    });
  }

  update(id: number, patch: UpdateTicketPayload): Observable<Ticket> {
    return this.http
      .patch<TicketDetailResponseDto>(`${BASE_URL}/${id}`, patch, {
        withCredentials: true
      })
      .pipe(map(mapTicketDetailResponse));
  }

  listComments(id: number): Observable<TicketComment[]> {
    return this.http
      .get<TicketCommentResponseDto[]>(`${BASE_URL}/${id}/comments`, {
        withCredentials: true
      })
      .pipe(map(comments => comments.map(mapTicketComment)));
  }

  addComment(id: number, payload: AddCommentPayload): Observable<TicketComment> {
    return this.http
      .post<TicketCommentResponseDto>(`${BASE_URL}/${id}/comments`, payload, {
        withCredentials: true
      })
      .pipe(map(mapTicketComment));
  }

  changeStatus(id: number, payload: ChangeStatusPayload): Observable<Ticket> {
    return this.http
      .post<TicketDetailResponseDto>(`${BASE_URL}/${id}/status`, payload, {
        withCredentials: true
      })
      .pipe(map(mapTicketDetailResponse));
  }

  cancel(id: number, note?: string): Observable<Ticket> {
    return this.changeStatus(id, { toStatus: 'CANCELLED', note });
  }
}

interface TicketDetailResponseDto {
  id: number;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  category: TicketCategory;
  categoryLabel?: string | null;
  reporterId?: number | null;
  reporterFullName?: string | null;
  reporterUsername?: string | null;
  assigneeId?: number | null;
  assigneeFullName?: string | null;
  assigneeUsername?: string | null;
  slaResponseDeadline?: string | null;
  slaResolutionDeadline?: string | null;
  slaFlag?: SlaFlag | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
}

interface TicketCommentResponseDto {
  id: number;
  author?: string | null;
  internal: boolean;
  content: string;
  createdAt: string;
}

function mapTicketDetailResponse(dto: TicketDetailResponseDto): Ticket {
  return {
    id: dto.id,
    ticketNumber: dto.ticketNumber,
    subject: dto.subject,
    description: dto.description,
    status: dto.status,
    priority: dto.priority,
    reporter: toTicketUser(dto.reporterId, dto.reporterUsername, dto.reporterFullName),
    assignee: toTicketUser(dto.assigneeId, dto.assigneeUsername, dto.assigneeFullName),
    category: dto.category,
    categoryLabel: dto.categoryLabel ?? null,
    slaResponseDeadline: dto.slaResponseDeadline ?? null,
    slaResolutionDeadline: dto.slaResolutionDeadline ?? null,
    slaFlag: dto.slaFlag ?? null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt
  };
}

function toTicketUser(
  id?: number | null,
  username?: string | null,
  fullName?: string | null
): TicketUserRef | null {
  if (id == null) {
    return null;
  }
  return {
    id,
    username: username ?? null,
    fullName: fullName ?? null
  };
}

function mapTicketComment(dto: TicketCommentResponseDto): TicketComment {
  return {
    id: dto.id,
    authorName: dto.author ?? null,
    content: dto.content,
    isInternal: dto.internal,
    createdAt: dto.createdAt
  };
}

