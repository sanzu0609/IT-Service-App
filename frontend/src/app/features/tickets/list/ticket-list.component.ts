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
import { Priority, Ticket, TicketStatus } from '../../../core/models/ticket';
import { TicketListParams, TicketsService } from '../../../core/services/tickets.service';
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
  readonly page = signal<Page<Ticket> | null>(null);
  readonly filters = signal<TicketListParams>({
    page: 0,
    size: 10,
    status: undefined,
    priority: undefined
  });

  filterState: { status?: TicketStatus; priority?: Priority } = {};

  ngOnInit(): void {
    this.syncFilterState();
    this.load();
  }

  trackById(_: number, ticket: Ticket): number {
    return ticket.id;
  }

  applyFilters(): void {
    if (this.loading()) {
      return;
    }
    this.filters.set({
      status: this.filterState.status,
      priority: this.filterState.priority,
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
      page: 0,
      size: this.filters().size ?? 10
    });
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
      page: params.page ?? 0,
      size: params.size ?? 10
    };
  }

  private syncFilterState(): void {
    const current = this.filters();
    this.filterState = {
      status: current.status as TicketStatus | undefined,
      priority: current.priority as Priority | undefined
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
