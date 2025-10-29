import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Page } from '../../../core/models/api';
import { Priority, TicketStatus, TicketSummary } from '../../../core/models/ticket';
import { TicketListParams, TicketsService } from '../../../core/services/tickets.service';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/user';
import { ToastService } from '../../../core/services/toast.service';
import { SlaBadgeComponent } from '../components/sla-badge/sla-badge.component';
import { TicketStatusChipComponent } from '../components/ticket-status-chip.component';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SlaBadgeComponent,
    TicketStatusChipComponent
  ],
  templateUrl: './ticket-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketListComponent implements OnInit {
  private readonly tickets = inject(TicketsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly statuses: TicketStatus[] = [
    'NEW',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED',
    'ON_HOLD',
    'REOPENED',
    'CANCELLED'
  ];

  readonly priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly page = signal<Page<TicketSummary> | null>(null);
  readonly filters = signal<TicketListParams>({
    page: 0,
    size: 10,
    status: undefined,
    priority: undefined,
    search: undefined
  });

  readonly allowCreate = signal(false);
  private readonly userRole = signal<Role | null>(null);
  private readonly currentUserId = signal<number | null>(null);
  readonly cancelling = signal<number | null>(null);


  filterState: { status?: TicketStatus; priority?: Priority; search?: string } = {};

  async ngOnInit(): Promise<void> {
    await this.resolvePermissions();
    this.syncFilterState();
    this.load();
  }

  trackById(_: number, ticket: TicketSummary): number {
    return ticket.id;
  }

  canCreate(): boolean {
    return this.allowCreate();
  }

  canEdit(ticket: TicketSummary): boolean {
    const role = this.userRole();
    if (!role) {
      return false;
    }
    return role === 'ADMIN' || role === 'AGENT';
  }

  canCancel(ticket: TicketSummary): boolean {
    const role = this.userRole();
    if (!role) {
      return false;
    }
    if (ticket.status === 'CANCELLED') {
      return false;
    }
    return role === 'ADMIN' || role === 'AGENT';
  }

  applyFilters(): void {
    if (this.loading()) {
      return;
    }
    this.filters.set({
      status: this.filterState.status,
      priority: this.filterState.priority,
      search: this.filterState.search?.trim() || undefined,
      page: 0,
      size: this.filters().size ?? 10
    });
    this.load();
  }

  resetFilters(): void {
    if (this.loading()) {
      return;
    }
    this.filterState = {};
    this.filters.set({
      status: undefined,
      priority: undefined,
      search: undefined,
      page: 0,
      size: this.filters().size ?? 10
    });
    this.filterState.search = '';
    this.load();
  }

  changePage(offset: 1 | -1): void {
    if (this.loading()) {
      return;
    }
    const current = this.page();
    if (!current) {
      return;
    }
    const next = current.number + offset;
    if (next < 0 || next >= current.totalPages) {
      return;
    }
    this.filters.update(state => ({
      ...state,
      page: next
    }));
    this.load();
  }

  changePageSize(size: number | string): void {
    const parsed = Number(size);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return;
    }
    this.filters.update(state => ({
      ...state,
      size: parsed,
      page: 0
    }));
    this.load();
  }

  cancelTicket(ticket: TicketSummary): void {
    if (!this.canCancel(ticket) || this.cancelling() === ticket.id) {
      return;
    }
    this.cancelling.set(ticket.id);
    this.tickets
      .cancel(ticket.id)
      .pipe(finalize(() => this.cancelling.set(null)))
      .subscribe({
        next: () => {
          this.toast.success('Ticket cancelled.');
          this.load();
        },
        error: err => {
          const message = this.resolveErrorMessage(err);
          this.toast.error(message);
        }
      });
  }

  private async resolvePermissions(): Promise<void> {
    try {
      const me = await this.auth.ensureMe();
      this.userRole.set(me?.role ?? null);
      this.currentUserId.set(me?.id ?? null);
      const role = me?.role ?? null;
      this.allowCreate.set(role === 'END_USER' || role === 'ADMIN');
    } catch {
      this.userRole.set(null);
      this.currentUserId.set(null);
      this.allowCreate.set(false);
    }
  }

  private load(): void {
    const params = this.normalizeFilters(this.filters());
    this.loading.set(true);
    this.error.set(null);

    this.tickets
      .list(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.page.set(response);
          this.syncFilterState();
        },
        error: err => {
          this.error.set(this.resolveErrorMessage(err));
          this.page.set(null);
        }
      });
  }

  private normalizeFilters(params: TicketListParams): TicketListParams {
    return {
      status: params.status || undefined,
      priority: params.priority || undefined,
      search: params.search?.toString().trim() || undefined,
      page: params.page ?? 0,
      size: params.size ?? 10
    };
  }

  private syncFilterState(): void {
    const current = this.filters();
    this.filterState = {
      status: current.status as TicketStatus | undefined,
      priority: current.priority as Priority | undefined,
      search: current.search ?? this.filterState.search ?? ''
    };
  }

  private resolveErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as { error: unknown }).error === 'object'
    ) {
      const payload = (error as { error: { message?: string } }).error;
      if (payload?.message) {
        return payload.message;
      }
    }
    return 'Unable to load tickets. Please try again later.';
  }
}



