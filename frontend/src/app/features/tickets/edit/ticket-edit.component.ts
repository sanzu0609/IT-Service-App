import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Priority, Ticket, TicketStatus } from '../../../core/models/ticket';
import { TicketsService, UpdateTicketPayload } from '../../../core/services/tickets.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { Role, User } from '../../../core/models/user';
import { UsersService } from '../../../core/services/users.service';

@Component({
  selector: 'app-ticket-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ticket-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketEditComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly tickets = inject(TicketsService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly users = inject(UsersService);

  private readonly subscriptions = new Subscription();

  readonly priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly agents = signal<User[]>([]);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly ticket = signal<Ticket | null>(null);
  readonly ticketId = signal<number | null>(null);

  private readonly role = signal<Role | null>(null);
  private readonly currentUserId = signal<number | null>(null);

  readonly canEditSubject = signal(false);
  readonly canEditDescription = signal(false);
  readonly canEditPriority = signal(false);
  readonly canAssign = signal(false);
  readonly canEditAsset = signal(false);
  readonly canCancel = signal(false);

  readonly form = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    priority: ['MEDIUM' as Priority, Validators.required],
    assigneeId: [''],
    relatedAssetId: ['']
  });

  ngOnInit(): void {
    this.initialize();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  readonly showAgentSelect = computed(() => this.canAssign());

  showError(controlName: 'subject' | 'description'): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.invalid;
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid || !this.ticketId()) {
      this.form.markAllAsTouched();
      return;
    }

    const ticketId = this.ticketId()!;
    const ticket = this.ticket();
    if (!ticket) {
      return;
    }

    const raw = this.form.getRawValue();
    const trimmedSubject = raw.subject.trim();
    const trimmedDescription = raw.description.trim();

    const payload: UpdateTicketPayload = {};

    if (this.canEditSubject()) {
      payload.subject = trimmedSubject;
    }
    if (this.canEditDescription()) {
      payload.description = trimmedDescription;
    }
    if (this.canEditPriority()) {
      payload.priority = raw.priority ?? ticket.priority;
    }
    if (this.canAssign()) {
      const assigneeId = this.normalizeOptionalNumber(raw.assigneeId);
      payload.assigneeId = assigneeId ?? null;
    }
    if (this.canEditAsset()) {
      payload.relatedAssetId = this.normalizeOptionalNumber(raw.relatedAssetId) ?? null;
    }

    this.saving.set(true);
    this.error.set(null);

    const sub = this.tickets
      .update(ticketId, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: updated => this.handleSaveSuccess(updated),
        error: err => this.error.set(this.extractErrorMessage(err))
      });

    this.subscriptions.add(sub);
  }

  cancelTicket(): void {
    const ticketId = this.ticketId();
    if (ticketId === null || !this.canCancel()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const sub = this.tickets
      .cancel(ticketId)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: updated => {
          this.toast.success('Ticket cancelled.');
          this.router.navigate(['/tickets', updated.id]);
        },
        error: err => this.error.set(this.extractErrorMessage(err))
      });

    this.subscriptions.add(sub);
  }

  private async initialize(): Promise<void> {
    try {
      const me = await this.auth.ensureMe();
      this.role.set(me?.role ?? null);
      this.currentUserId.set(me?.id ?? null);
    } catch {
      this.role.set(null);
      this.currentUserId.set(null);
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (Number.isNaN(id)) {
      this.error.set('Ticket not found.');
      this.loading.set(false);
      return;
    }

    this.ticketId.set(id);
    this.fetchTicket(id);
    this.fetchAgents();
  }

  private fetchTicket(id: number): void {
    this.loading.set(true);
    const sub = this.tickets
      .get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ticket => {
          this.ticket.set(ticket);
          this.populateForm(ticket);
        },
        error: err => {
          this.error.set(this.extractErrorMessage(err));
        }
      });
    this.subscriptions.add(sub);
  }

  private fetchAgents(): void {
    const sub = this.users
      .list({ role: 'AGENT', size: 50 })
      .subscribe({
        next: page => this.agents.set(page.content ?? []),
        error: () => this.agents.set([])
      });
    this.subscriptions.add(sub);
  }

  private populateForm(ticket: Ticket): void {
    this.form.patchValue({
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      assigneeId: ticket.assignee?.id ?? '',
      relatedAssetId: ticket.relatedAssetId ?? ''
    });

    this.applyPermissions(ticket);
  }

  private applyPermissions(ticket: Ticket): void {
    const role = this.role();
    const currentUserId = this.currentUserId();
    const isReporter = currentUserId !== null && ticket.reporter?.id === currentUserId;
    const isAdmin = role === 'ADMIN';
    const isAgent = role === 'AGENT';
    const isEndUser = role === 'END_USER';

    const ticketStatus = ticket.status as TicketStatus;
    const reporterEdit = isEndUser && isReporter && ticketStatus === 'NEW';

    const canEditSubject = isAdmin || isAgent || reporterEdit;
    const canEditDescription = canEditSubject;
    const canEditPriority = isAdmin || isAgent;
    const canAssign = isAdmin || isAgent;
    const canEditAsset = isAdmin || isAgent;
    const canCancel = isAdmin || isAgent || reporterEdit;

    this.canEditSubject.set(canEditSubject);
    this.canEditDescription.set(canEditDescription);
    this.canEditPriority.set(canEditPriority);
    this.canAssign.set(canAssign);
    this.canEditAsset.set(canEditAsset);
    this.canCancel.set(canCancel);

    this.toggleControl(this.form.controls.subject, canEditSubject, ticket.subject);
    this.toggleControl(this.form.controls.description, canEditDescription, ticket.description);
    this.toggleControl(this.form.controls.priority, canEditPriority, ticket.priority);
    this.toggleControl(this.form.controls.assigneeId, canAssign, ticket.assignee?.id ?? '');
    this.toggleControl(this.form.controls.relatedAssetId, canEditAsset, ticket.relatedAssetId ?? '');
  }

  private toggleControl(control: AbstractControl, enabled: boolean, value: unknown): void {
    if (enabled) {
      control.enable({ emitEvent: false });
    } else {
      control.disable({ emitEvent: false });
    }
    (control as any).setValue(value, { emitEvent: false });
  }

  private handleSaveSuccess(ticket: Ticket): void {
    this.toast.success('Ticket updated successfully.');
    this.router.navigate(['/tickets', ticket.id]);
  }

  private extractErrorMessage(error: unknown): string {
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
    return 'Unable to process your request. Please try again later.';
  }

  private normalizeOptionalNumber(value: unknown): number | null | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
}


