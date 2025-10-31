import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Page } from '../../../core/models/api';
import { Priority, TicketStatus, TicketSummary } from '../../../core/models/ticket';
import { TicketListParams, TicketsService } from '../../../core/services/tickets.service';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/user';
import { ToastService } from '../../../core/services/toast.service';
import { CountdownComponent } from '../../../shared/components/countdown/countdown.component';
import { DateUtcPipe } from '../../../shared/pipes/date-utc.pipe';
import { getSlaClass, getSlaLabel } from '../utils/ticket-style.util';
import { Ticket } from '../../../core/models/ticket';
import { TicketStatusChipComponent } from '../components/ticket-status-chip.component';
import { TicketCreateComponent } from '../create/ticket-create.component';
import { TicketEditComponent } from '../edit/ticket-edit.component';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CountdownComponent,
    TicketStatusChipComponent,
    TicketCreateComponent,
    TicketEditComponent
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
  readonly showCreateModal = signal(false);
  readonly editingTicketId = signal<number | null>(null);
  private readonly userRole = signal<Role | null>(null);
  private readonly currentUserId = signal<number | null>(null);
  readonly cancelling = signal<number | null>(null);
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
  private readonly destroyRef = inject(DestroyRef);
  // simple in-memory cache for ticket details on the current page
  private readonly detailCache = new Map<number, Ticket>();
  private readonly router = inject(Router);

  // expose SLA helpers for template
  slaClass(flag?: unknown): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return getSlaClass(flag);
  }

  openCreate(): void {
    this.showCreateModal.set(true);
  }

  async onCreateClosed(createdId: number | null): Promise<void> {
    this.showCreateModal.set(false);
    // reload list to show created ticket
    this.load();
    if (createdId != null) {
      // navigate to detail after closing modal
      this.router.navigate(['/tickets', createdId]);
    }
  }

  openEdit(id: number): void {
    this.editingTicketId.set(id);
  }

  onEditClosed(updatedId: number | null): void {
    this.editingTicketId.set(null);
    this.load();
    if (updatedId != null) {
      this.router.navigate(['/tickets', updatedId]);
    }
  }

  slaLabel(flag?: unknown): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return getSlaLabel(flag);
  }

  getSlaTarget(ticket: TicketSummary): string | undefined {
    const detail = this.getDetail(ticket.id);
    return (
      detail?.slaResponseDeadline ?? ticket.slaResponseDeadline ?? detail?.slaResolutionDeadline ?? ticket.slaResolutionDeadline ?? undefined
    );
  }


  filterState: { status?: TicketStatus; priority?: Priority; search?: string } = {};

  async ngOnInit(): Promise<void> {
    await this.resolvePermissions();
    this.syncFilterState();
    this.load();
    // start polling to refresh ticket list (SLA updates)
    this.pollTimer = setInterval(() => {
      try {
        if (!this.loading()) {
          this.load();
        }
      } catch {
        // ignore polling errors
      }
    }, this.POLL_INTERVAL_MS);

    this.destroyRef.onDestroy(() => {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    });
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
          // fetch details (deadlines, full SLA info) for visible tickets
          this.loadDetailsForCurrentPage();
        },
        error: err => {
          this.error.set(this.resolveErrorMessage(err));
          this.page.set(null);
        }
      });
  }

  private loadDetailsForCurrentPage(): void {
    const current = this.page();
    if (!current || !current.content.length) {
      this.detailCache.clear();
      return;
    }

    const idsOnPage = new Set(current.content.map(t => t.id));

    // remove cached entries not on current page
    for (const id of Array.from(this.detailCache.keys())) {
      if (!idsOnPage.has(id)) {
        this.detailCache.delete(id);
      }
    }

    // fetch details for tickets not cached
    for (const t of current.content) {
      if (this.detailCache.has(t.id)) {
        continue;
      }
      this.tickets.get(t.id).subscribe({
        next: full => {
          this.detailCache.set(full.id, full);
        },
        error: () => {
          // ignore per-item errors; badge from summary still shows
        }
      });
    }
  }

  getDetail(id: number): Ticket | undefined {
    return this.detailCache.get(id);
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



