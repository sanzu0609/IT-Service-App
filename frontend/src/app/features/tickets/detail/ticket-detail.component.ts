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
import { Ticket, TicketComment } from '../../../core/models/ticket';
import { TicketsService } from '../../../core/services/tickets.service';
import { SlaBadgeComponent } from '../components/sla-badge/sla-badge.component';
import { TicketStatusChipComponent } from '../components/ticket-status-chip.component';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/user';

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

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly ticket = signal<Ticket | null>(null);

  readonly comments = signal<TicketComment[]>([]);
  readonly commentsLoading = signal(false);
  readonly commentError = signal<string | null>(null);
  readonly commentSubmitting = signal(false);

  private readonly userRole = signal<Role | null>(null);
  readonly canViewInternal = computed(() => this.userRole() !== 'END_USER');
  readonly canMarkInternal = computed(() => this.userRole() !== 'END_USER');
  readonly visibleComments = computed(() => {
    const all = this.comments();
    return this.canViewInternal() ? all : all.filter(comment => !comment.isInternal);
  });

  readonly commentForm = this.fb.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(2000)]],
    isInternal: [false]
  });

  async ngOnInit(): Promise<void> {
    await this.resolveUserRole();

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isNaN(id)) {
      this.error.set('Invalid ticket id.');
      return;
    }

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

    const ticketId = this.ticket()?.id;
    if (!ticketId) {
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

  trackComment(_index: number, comment: TicketComment): number {
    return comment.id;
  }

  private async resolveUserRole(): Promise<void> {
    try {
      const me = await this.auth.ensureMe();
      const role = me?.role ?? null;
      this.userRole.set(role);
      if (role === 'END_USER') {
        this.commentForm.controls.isInternal.setValue(false, { emitEvent: false });
        this.commentForm.controls.isInternal.disable({ emitEvent: false });
      } else {
        this.commentForm.controls.isInternal.enable({ emitEvent: false });
      }
    } catch {
      this.userRole.set(null);
      this.commentForm.controls.isInternal.setValue(false, { emitEvent: false });
      this.commentForm.controls.isInternal.disable({ emitEvent: false });
    }
  }

  private fetchTicket(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.tickets
      .get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ticket => this.ticket.set(ticket),
        error: err => {
          this.error.set(this.resolveTicketError(err));
          this.ticket.set(null);
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
