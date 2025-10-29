import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Ticket, TicketComment, TicketStatus } from '../../../core/models/ticket';
import { TicketsService } from '../../../core/services/tickets.service';
import { SlaBadgeComponent } from '../components/sla-badge/sla-badge.component';
import { TicketStatusChipComponent } from '../components/ticket-status-chip.component';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/user';

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'ON_HOLD', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  REOPENED: ['IN_PROGRESS', 'CANCELLED'],
  CANCELLED: []
};

const AGENT_ALLOWED: TicketStatus[] = ['IN_PROGRESS', 'RESOLVED'];

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    SlaBadgeComponent,
    TicketStatusChipComponent
  ],
  templateUrl: './ticket-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tickets = inject(TicketsService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  private ticketId: number | null = null;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly ticket = signal<Ticket | null>(null);

  readonly comments = signal<TicketComment[]>([]);
  readonly commentsLoading = signal(false);
  readonly commentError = signal<string | null>(null);
  readonly commentSubmitting = signal(false);

  readonly statusSubmitting = signal(false);
  readonly statusError = signal<string | null>(null);
  readonly statusMessage = signal<string | null>(null);

  private readonly userRole = signal<Role | null>(null);
  private readonly currentUserId = signal<number | null>(null);| null>(null);

  readonly canViewInternal = computed(() => this.userRole() !== 'END_USER');
  readonly canMarkInternal = computed(() => this.userRole() !== 'END_USER');
  readonly canChangeStatus = computed(() => {
    const role = this.userRole();
    return role === 'ADMIN' || role === 'AGENT';
  });

  readonly visibleComments = computed(() => {
    const all = this.comments();
    return this.canViewInternal() ? all : all.filter(comment => !comment.isInternal);
  });

  readonly availableStatuses = computed(() => {
    const currentTicket = this.ticket();
    if (!currentTicket || !this.canChangeStatus()) {
      return [] as TicketStatus[];
    }

    const candidates = STATUS_TRANSITIONS[currentTicket.status] ?? [];
    const role = this.userRole();

    if (role === 'AGENT') {
      return candidates.filter(status => AGENT_ALLOWED.includes(status));
    }

    if (role === 'ADMIN') {
      return candidates;
    }

    return [] as TicketStatus[];
  });

  readonly canEditTicket = computed(() => {
    const ticket = this.ticket();
    const role = this.userRole();
    const currentUserId = this.currentUserId();
    if (!ticket || !role) {
      return false;
    }
    if (role === 'ADMIN' || role === 'AGENT') {
      return true;
    }
    if (role === 'END_USER' && currentUserId !== null) {
      return ticket.reporter?.id === currentUserId && ticket.status === 'NEW';
    }
    return false;
  });

  readonly commentForm = this.fb.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(2000)]],
    isInternal: [false]
  });

  readonly statusForm = this.fb.nonNullable.group({
    toStatus: ['', Validators.required],
    note: ['', [Validators.maxLength(1000)]]
  });

  async ngOnInit(): Promise<void> {
    await this.resolveUserRole();

    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (Number.isNaN(id)) {
      this.error.set('Ticket not found.');
      return;
    }

    this.ticketId = id;
    this.fetchTicket(id);
    this.fetchComments(id);
  }

  submitComment(): void {
    if (this.commentSubmitting()) {
      return;
    }

    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    const ticketId = this.ticketId;
    if (ticketId === null) {
      return;
    }

    const raw = this.commentForm.getRawValue();
    const trimmedContent = raw.content.trim();
    if (!trimmedContent) {
      this.commentForm.controls.content.setValue('');
      this.commentForm.controls.content.setErrors({ required: true });
      this.commentForm.controls.content.markAsTouched();
      return;
    }

    const payload = {
      content: trimmedContent,
      isInternal: this.canMarkInternal() ? !!raw.isInternal : false
    };

    this.commentSubmitting.set(true);
    this.commentError.set(null);

    this.tickets
      .addComment(ticketId, payload)
      .pipe(finalize(() => this.commentSubmitting.set(false)))
      .subscribe({
        next: comment => {
          this.upsertComment(comment);
          this.commentForm.reset({
            content: '',
            isInternal: payload.isInternal
          });
          if (!this.canMarkInternal()) {
            this.commentForm.controls.isInternal.disable({ emitEvent: false });
            this.commentForm.controls.isInternal.setValue(false, { emitEvent: false });
          }
        },
        error: err => {
          this.commentError.set(
            this.extractErrorMessage(err, 'Unable to add comment. Please try again.')
          );
        }
      });
  }

  changeStatus(): void {
    if (!this.canChangeStatus() || this.statusSubmitting()) {
      return;
    }

    if (this.statusForm.invalid) {
      this.statusForm.markAllAsTouched();
      return;
    }

    const ticketId = this.ticketId;
    if (ticketId === null) {
      return;
    }

    const { toStatus, note } = this.statusForm.getRawValue();
    const allowedStatuses = this.availableStatuses();
    if (!toStatus || !allowedStatuses.includes(toStatus as TicketStatus)) {
      this.statusForm.controls.toStatus.setErrors({ invalid: true });
      this.statusForm.controls.toStatus.markAsTouched();
      return;
    }

    this.statusSubmitting.set(true);
    this.statusError.set(null);
    this.statusMessage.set(null);

    this.tickets
      .changeStatus(ticketId, {
        toStatus: toStatus as TicketStatus,
        note: note?.trim() ? note.trim() : undefined
      })
      .pipe(finalize(() => this.statusSubmitting.set(false)))
      .subscribe({
        next: updatedTicket => {
          this.ticket.set(updatedTicket);
          this.statusMessage.set('Status updated successfully.');
          this.statusForm.controls.note.setValue('', { emitEvent: false });
          this.syncStatusForm();
        },
        error: err => {
          this.statusError.set(
            this.extractErrorMessage(err, 'Unable to update status. Please try again.')
          );
        }
      });
  }

  trackComment(_index: number, comment: TicketComment): number {
    return comment.id;
  }

  private async resolveUserRole(): Promise<void> {
    try {
      const me = await this.auth.ensureMe();
      const role = me?.role ?? null;
      this.userRole.set(role);
      this.currentUserId.set(me?.id ?? null);
      if (role === 'END_USER') {
        this.commentForm.controls.isInternal.setValue(false, { emitEvent: false });
        this.commentForm.controls.isInternal.disable({ emitEvent: false });
      } else {
        this.commentForm.controls.isInternal.enable({ emitEvent: false });
      }
    } catch {
      this.userRole.set(null);
      this.currentUserId.set(null);
      this.commentForm.controls.isInternal.setValue(false, { emitEvent: false });
      this.commentForm.controls.isInternal.disable({ emitEvent: false });
    } finally {
      this.syncStatusForm();
    }
  }

  private fetchTicket(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.tickets
      .get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ticket => {
          this.ticket.set(ticket);
          this.syncStatusForm();
        },
        error: err => {
          this.error.set(this.resolveTicketError(err));
          this.ticket.set(null);
          this.syncStatusForm();
        }
      });
  }

  private fetchComments(id: number): void {
    this.commentsLoading.set(true);
    this.commentError.set(null);

    this.tickets
      .listComments(id)
      .pipe(finalize(() => this.commentsLoading.set(false)))
      .subscribe({
        next: comments => this.comments.set(this.sortComments(comments ?? [])),
        error: err => {
          this.commentError.set(
            this.extractErrorMessage(err, 'Unable to load comments. Please try again later.')
          );
        }
      });
  }

  private upsertComment(comment: TicketComment): void {
    const updated = [...this.comments(), comment];
    this.comments.set(this.sortComments(updated));
  }

  private sortComments(list: TicketComment[]): TicketComment[] {
    return [...list].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return aTime - bTime;
    });
  }

  private syncStatusForm(): void {
    const options = this.availableStatuses();
    const hasTicket = !!this.ticket();

    if (!this.canChangeStatus() || !hasTicket || options.length === 0) {
      this.statusForm.reset({ toStatus: '', note: '' }, { emitEvent: false });
      this.statusForm.disable({ emitEvent: false });
      return;
    }

    this.statusForm.enable({ emitEvent: false });
    const currentValue = this.statusForm.controls.toStatus.value as TicketStatus | '';
    if (!currentValue || !options.includes(currentValue as TicketStatus)) {
      this.statusForm.controls.toStatus.setValue(options[0], { emitEvent: false });
    }
  }

  private resolveTicketError(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status?: unknown }).status === 404
    ) {
      return 'Ticket not found.';
    }

    return this.extractErrorMessage(
      error,
      'Unable to load ticket detail. Please try again later.'
    );
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
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

    return fallback;
  }
}



