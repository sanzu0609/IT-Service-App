import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Ticket, TicketComment, TicketHistory, TicketStatus } from '../../../core/models/ticket';
import { TicketsService } from '../../../core/services/tickets.service';
import { SlaBadgeComponent } from '../../../shared/components/sla-badge/sla-badge.component';
import { TicketStatusChipComponent } from '../components/ticket-status-chip.component';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/user';
import { ToastService } from '../../../core/services/toast.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DateUtcPipe } from '../../../shared/pipes/date-utc.pipe';
import { CountdownComponent } from '../../../shared/components/countdown/countdown.component';
import { getSlaClass, getSlaLabel } from '../utils/ticket-style.util';

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
    TicketStatusChipComponent,
    DateUtcPipe,
    CountdownComponent
  ],
  templateUrl: './ticket-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tickets = inject(TicketsService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

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
  private readonly currentUserId = signal<number | null>(null);

  readonly canComment = computed(() => this.userRole() !== null);

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
    note: ['', [Validators.maxLength(500)]],
    holdReason: ['']
  });

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

  // expose helper for templates to get SLA badge classes
  slaClass(flag?: unknown): string {
    // delegate to shared util; coerce unknown to expected union
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return getSlaClass(flag);
  }

  slaLabel(flag?: unknown): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return getSlaLabel(flag);
  }

  async ngOnInit(): Promise<void> {
    this.statusForm.controls.holdReason.disable({ emitEvent: false });
    this.toggleHoldReasonControl('NEW');
    this.statusForm.controls.toStatus.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        const status = (value ?? '') as TicketStatus | '';
        if (!status) {
          this.toggleHoldReasonControl('NEW');
          return;
        }
        this.toggleHoldReasonControl(status as TicketStatus);
      });

    this.applyCommentPermissions(null);
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
    // start polling detail (refresh ticket and comments periodically)
    this.pollTimer = setInterval(() => {
      try {
        if (!this.loading() && this.ticketId != null) {
          // lightweight refresh without toggling the global loading UI
          this.refreshTicket(this.ticketId);
          this.fetchComments(this.ticketId);
        }
      } catch {
        // ignore
      }
    }, this.POLL_INTERVAL_MS);

    this.destroyRef.onDestroy(() => {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    });
  }

  submitComment(): void {
    if (this.commentSubmitting() || !this.canComment() || this.commentForm.disabled) {
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
          this.commentError.set(null);
          this.resetCommentForm(payload.isInternal);
          this.toast.success('Comment added successfully.');
        },
        error: err => {
          const message = this.extractErrorMessage(err, 'Unable to add comment. Please try again.');
          this.commentError.set(message);
          this.toast.error(message);
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

    const { toStatus, note, holdReason } = this.statusForm.getRawValue();
    const allowedStatuses = this.availableStatuses();
    if (!toStatus || !allowedStatuses.includes(toStatus as TicketStatus)) {
      this.statusForm.controls.toStatus.setErrors({ invalid: true });
      this.statusForm.controls.toStatus.markAsTouched();
      return;
    }

    const trimmedNote = note?.trim() ?? '';
    const trimmedHoldReason = holdReason?.trim() ?? '';

    if ((toStatus as TicketStatus) === 'ON_HOLD' && !trimmedHoldReason) {
      this.statusForm.controls.holdReason.setErrors({ required: true });
      this.statusForm.controls.holdReason.markAsTouched();
      return;
    }

    this.statusSubmitting.set(true);
    this.statusError.set(null);
    this.statusMessage.set(null);

    this.tickets
      .changeStatus(ticketId, {
        toStatus: toStatus as TicketStatus,
        note: trimmedNote ? trimmedNote : undefined,
        holdReason: this.shouldSendHoldReason(toStatus as TicketStatus, trimmedHoldReason)
      })
      .pipe(finalize(() => this.statusSubmitting.set(false)))
      .subscribe({
        next: updatedTicket => {
          this.ticket.set(updatedTicket);
          this.statusMessage.set('Status updated successfully.');
          this.statusForm.controls.note.setValue('', { emitEvent: false });
          this.statusForm.controls.holdReason.setValue('', { emitEvent: false });
          this.syncStatusForm();
          this.toast.success('Status updated successfully.');
        },
        error: err => {
          const message = this.extractErrorMessage(err, 'Unable to update status. Please try again.');
          this.statusError.set(message);
          this.toast.error(message);
        }
      });
  }

  trackComment(_index: number, comment: TicketComment): number {
    return comment.id;
  }

  trackHistory(_index: number, history: TicketHistory): number {
    return history.id;
  }

  private async resolveUserRole(): Promise<void> {
    try {
      const me = await this.auth.ensureMe();
      const role = me?.role ?? null;
      this.userRole.set(role);
      this.currentUserId.set(me?.id ?? null);
      this.applyCommentPermissions(role);
    } catch {
      this.userRole.set(null);
      this.currentUserId.set(null);
      this.applyCommentPermissions(null);
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
          console.log('Fetched ticket:', ticket);
          console.log('History count:', ticket.history?.length);
          this.ticket.set(ticket);
          this.syncStatusForm();
        },
        error: err => {
          // handle auth / network errors specially
          this.ticket.set(null);
          this.syncStatusForm();
          this.handleFetchError(err, id);
        }
      });
  }

  // lightweight refresh used by polling: updates ticket signal without toggling loading state
  private refreshTicket(id: number): void {
    this.tickets.get(id).subscribe({
      next: ticket => {
        this.ticket.set(ticket);
        this.syncStatusForm();
      },
      error: () => {
        // swallow errors during background refresh
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
          const message = this.extractErrorMessage(err, 'Unable to load comments. Please try again later.');
          this.commentError.set(message);
          this.toast.error(message);
        }
      });
  }

  private handleFetchError(err: unknown, id: number): void {
    // If unauthorized, redirect to login so user can re-authenticate
    try {
      const anyErr = err as { status?: number };
      if (anyErr?.status === 401 || anyErr?.status === 403) {
        // preserve return url
        this.router.navigate(['/login'], { queryParams: { next: `/tickets/${id}` } });
        return;
      }
    } catch {
      // ignore
    }

    // otherwise set an error message for the UI
    this.error.set(this.resolveTicketError(err));
  }

  private upsertComment(comment: TicketComment): void {
    const updated = [...this.comments(), comment];
    this.comments.set(this.sortComments(updated));
  }

  private resetCommentForm(keepInternal: boolean): void {
    const allowInternal = this.canMarkInternal();
    const nextInternal = allowInternal && keepInternal;

    this.commentForm.reset(
      {
        content: '',
        isInternal: nextInternal
      },
      { emitEvent: false }
    );

    if (!allowInternal) {
      this.commentForm.controls.isInternal.setValue(false, { emitEvent: false });
      this.commentForm.controls.isInternal.disable({ emitEvent: false });
    } else {
      this.commentForm.controls.isInternal.enable({ emitEvent: false });
    }

    this.commentForm.controls.content.markAsPristine();
    this.commentForm.controls.content.markAsUntouched();
  }

  private applyCommentPermissions(role: Role | null): void {
    if (!role) {
      this.commentForm.disable({ emitEvent: false });
      this.commentForm.controls.isInternal.setValue(false, { emitEvent: false });
      this.commentForm.controls.content.setValue('', { emitEvent: false });
      return;
    }

    this.commentForm.enable({ emitEvent: false });
    if (role === 'END_USER') {
      this.commentForm.controls.isInternal.setValue(false, { emitEvent: false });
      this.commentForm.controls.isInternal.disable({ emitEvent: false });
    } else {
      this.commentForm.controls.isInternal.enable({ emitEvent: false });
    }

    this.resetCommentForm(false);
  }

  private sortComments(list: TicketComment[]): TicketComment[] {
    return [...list].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }

  private syncStatusForm(): void {
    const options = this.availableStatuses();
    const hasTicket = !!this.ticket();

    if (!this.canChangeStatus() || !hasTicket || options.length === 0) {
      this.statusForm.reset({ toStatus: '', note: '', holdReason: '' }, { emitEvent: false });
      this.statusForm.controls.holdReason.clearValidators();
      this.statusForm.controls.holdReason.updateValueAndValidity({ emitEvent: false });
      this.statusForm.disable({ emitEvent: false });
      return;
    }

    this.statusForm.enable({ emitEvent: false });
    const currentValue = this.statusForm.controls.toStatus.value as TicketStatus | '';
    const nextStatus =
      currentValue && options.includes(currentValue as TicketStatus)
        ? (currentValue as TicketStatus)
        : options[0];
    this.statusForm.controls.toStatus.setValue(nextStatus, { emitEvent: false });

    this.toggleHoldReasonControl(nextStatus);
  }

  private toggleHoldReasonControl(nextStatus: TicketStatus): void {
    const requiresHoldReason = nextStatus === 'ON_HOLD';
    if (!requiresHoldReason) {
      this.statusForm.controls.holdReason.clearValidators();
      this.statusForm.controls.holdReason.setValue('', { emitEvent: false });
      this.statusForm.controls.holdReason.updateValueAndValidity({ emitEvent: false });
      this.statusForm.controls.holdReason.disable({ emitEvent: false });
      return;
    }

    this.statusForm.controls.holdReason.enable({ emitEvent: false });
    this.statusForm.controls.holdReason.setValidators([Validators.required, Validators.maxLength(250)]);
    this.statusForm.controls.holdReason.updateValueAndValidity({ emitEvent: false });
    if (!this.statusForm.controls.holdReason.value) {
      this.statusForm.controls.holdReason.markAsPristine();
      this.statusForm.controls.holdReason.markAsUntouched();
    }
  }

  private shouldSendHoldReason(status: TicketStatus, reason: string): string | undefined {
    if (status === 'ON_HOLD') {
      return reason || undefined;
    }
    return undefined;
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



