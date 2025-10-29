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
import {
  TicketCategoriesService,
  TicketCategory
} from '../../../core/services/ticket-categories.service';

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
  private readonly categoriesService = inject(TicketCategoriesService);

  private readonly subscriptions = new Subscription();

  readonly priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly categories = signal<TicketCategory[]>([]);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly forbidden = signal(false);
  readonly categoriesLoading = signal(false);
  readonly categoriesError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]],
    priority: ['MEDIUM' as Priority, Validators.required],
    categoryId: ['', Validators.required],
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

  showCategoryError(): boolean {
    const control = this.form.controls.categoryId;
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
    const resolvedCategoryId = this.normalizeRequiredNumber(categoryId);

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

    if (resolvedCategoryId === undefined) {
      this.form.controls.categoryId.setErrors({ required: true });
      this.form.controls.categoryId.markAsTouched();
      return;
    }

    const payload = {
      subject: trimmedSubject,
      description: trimmedDescription,
      priority: priority ?? 'MEDIUM',
      categoryId: resolvedCategoryId,
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
      } else {
        this.form.enable({ emitEvent: false });
      }
    } catch {
      this.forbidden.set(true);
      this.form.disable({ emitEvent: false });
      this.error.set('You must be signed in to create tickets.');
    }
  }

  private loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(null);

    const sub = this.categoriesService
      .list()
      .pipe(finalize(() => this.categoriesLoading.set(false)))
      .subscribe({
        next: categories => {
          this.categories.set(categories);
          if (categories.length === 0) {
            this.categoriesError.set('No categories available. Please contact support.');
            this.form.controls.categoryId.disable({ emitEvent: false });
            this.form.controls.categoryId.setValue('', { emitEvent: false });
          } else {
            if (!this.forbidden()) {
              this.form.controls.categoryId.enable({ emitEvent: false });
            }
            const currentValue = this.form.controls.categoryId.value;
            if (currentValue === '' || currentValue === null) {
              this.form.controls.categoryId.setValue(String(categories[0].id));
            }
            if (this.error() === 'Unable to load categories. Please try again later.') {
              this.error.set(null);
            }
          }
        },
        error: err => {
          const message = this.extractErrorMessage(err, 'Unable to load categories.');
          this.categoriesError.set(message);
          this.form.controls.categoryId.disable({ emitEvent: false });
          this.form.controls.categoryId.setValue('', { emitEvent: false });
          this.error.set('Unable to load categories. Please try again later.');
          this.toast.error(message);
        }
      });

    this.subscriptions.add(sub);
  }

  private handleSuccess(ticket: Ticket): void {
    this.toast.success('Ticket created successfully.');
    this.router.navigate(['/tickets', ticket.id]);
  }

  private handleError(error: unknown): void {
    const message = this.extractErrorMessage(error, 'Unable to create ticket right now. Please try again later.');
    this.error.set(message);
    this.toast.error(message);
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

  private normalizeOptionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const normalized =
      typeof value === 'string' ? value.trim() : value;
    if (normalized === '') {
      return undefined;
    }

    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private normalizeRequiredNumber(value: unknown): number | undefined {
    const parsed = this.normalizeOptionalNumber(value);
    return parsed === undefined ? undefined : parsed;
  }
}
