import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Priority, Ticket } from '../../../core/models/ticket';
import { TicketsService } from '../../../core/services/tickets.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

interface CategoryOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ticket-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketCreateComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly tickets = inject(TicketsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private readonly subscriptions = new Subscription();

  readonly priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly categories = signal<CategoryOption[]>([]);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly forbidden = signal(false);

  readonly form = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    priority: ['MEDIUM' as Priority, Validators.required],
    categoryId: [''],
    relatedAssetId: ['']
  });

  async ngOnInit(): Promise<void> {
    await this.resolvePermissions();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  showError(controlName: 'subject' | 'description'): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.invalid;
  }

  submit(): void {
    if (this.forbidden() || this.loading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { subject, description, priority, categoryId, relatedAssetId } = this.form.getRawValue();
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();

    if (!trimmedSubject) {
      this.form.controls.subject.setValue('');
      this.form.controls.subject.setErrors({ required: true });
      this.form.controls.subject.markAsTouched();
      return;
    }

    if (!trimmedDescription) {
      this.form.controls.description.setValue('');
      this.form.controls.description.setErrors({ required: true });
      this.form.controls.description.markAsTouched();
      return;
    }

    const payload = {
      subject: trimmedSubject,
      description: trimmedDescription,
      priority: priority ?? 'MEDIUM',
      categoryId: this.normalizeOptionalNumber(categoryId),
      relatedAssetId: this.normalizeOptionalNumber(relatedAssetId)
    };

    this.loading.set(true);
    this.error.set(null);

    const sub = this.tickets
      .create(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ticket => this.handleSuccess(ticket),
        error: err => this.handleError(err)
      });

    this.subscriptions.add(sub);
  }

  private async resolvePermissions(): Promise<void> {
    try {
      const me = await this.auth.ensureMe();
      const role = me?.role ?? null;
      const allowed = role === 'END_USER' || role === 'ADMIN';
      this.forbidden.set(!allowed);
      if (!allowed) {
        this.form.disable({ emitEvent: false });
        this.error.set('You do not have permission to create tickets.');
      }
    } catch {
      this.forbidden.set(true);
      this.form.disable({ emitEvent: false });
      this.error.set('You must be signed in to create tickets.');
    }
  }

  private loadCategories(): void {
    // Placeholder: hook real categories service once available.
    this.categories.set([]);
  }

  private handleSuccess(ticket: Ticket): void {
    this.toast.success('Ticket created successfully.');
    this.router.navigate(['/tickets', ticket.id]);
  }

  private handleError(error: unknown): void {
    this.error.set(this.extractErrorMessage(error));
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
    return 'Unable to create ticket right now. Please try again later.';
  }

  private normalizeOptionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
}
