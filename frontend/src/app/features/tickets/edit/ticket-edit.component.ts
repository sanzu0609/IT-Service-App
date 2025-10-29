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
import { Priority, Ticket, TicketCategory } from '../../../core/models/ticket';
import { TicketsService, UpdateTicketPayload } from '../../../core/services/tickets.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { Role, User } from '../../../core/models/user';
import { UsersService } from '../../../core/services/users.service';
import {
  TicketCategoriesService,
  TicketCategoryOption
} from '../../../core/services/ticket-categories.service';

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
  private readonly categoriesService = inject(TicketCategoriesService);

  private readonly subscriptions = new Subscription();

  readonly priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly agents = signal<User[]>([]);
  readonly categories = signal<TicketCategoryOption[]>([]);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly categoriesLoading = signal(false);
  readonly categoriesError = signal<string | null>(null);

  readonly ticket = signal<Ticket | null>(null);
  readonly ticketId = signal<number | null>(null);

  private readonly role = signal<Role | null>(null);
  private readonly categoriesLoaded = signal(false);

  readonly canEditSubject = signal(false);
  readonly canEditDescription = signal(false);
  readonly canEditPriority = signal(false);
  readonly canAssign = signal(false);
  readonly canEditAsset = signal(false);
  readonly canCancel = signal(false);
  readonly canEditCategory = signal(false);

  readonly form = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]],
    priority: ['MEDIUM' as Priority, Validators.required],
    assigneeId: [''],
    category: ['', Validators.required],
    relatedAssetId: ['']
  });

  ngOnInit(): void {
    this.initialize();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  readonly showAgentSelect = computed(() => this.canAssign());
  readonly canSave = computed(
    () =>
      this.canEditSubject() ||
      this.canEditDescription() ||
      this.canEditPriority() ||
      this.canAssign() ||
      this.canEditAsset() ||
      this.canEditCategory()
  );

  showError(controlName: 'subject' | 'description'): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.invalid;
  }

  showCategoryError(): boolean {
    const control = this.form.controls.category;
    return control.touched && control.invalid;
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    if (this.canEditCategory()) {
      if (!this.categoriesLoaded() || this.categoriesLoading()) {
        this.toast.info('Please wait for categories to finish loading.');
        return;
      }
      const categoryError = this.categoriesError();
      if (categoryError) {
        this.toast.error(categoryError);
        return;
      }
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
      if (!trimmedSubject) {
        this.form.controls.subject.setValue('', { emitEvent: false });
        this.form.controls.subject.setErrors({ required: true });
        this.form.controls.subject.markAsTouched();
        return;
      }
      payload.subject = trimmedSubject;
    }
    if (this.canEditDescription()) {
      if (!trimmedDescription) {
        this.form.controls.description.setValue('', { emitEvent: false });
        this.form.controls.description.setErrors({ required: true });
        this.form.controls.description.markAsTouched();
        return;
      }
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
    if (this.canEditCategory()) {
      const category = this.normalizeCategory(raw.category);
      if (!category) {
        this.form.controls.category.setErrors({ required: true });
        this.form.controls.category.markAsTouched();
        return;
      }
      payload.category = category;
    }

    if (Object.keys(payload).length === 0) {
      this.toast.info('No changes to save.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const sub = this.tickets
      .update(ticketId, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: updated => this.handleSaveSuccess(updated),
        error: err => {
          const message = this.extractErrorMessage(err);
          this.error.set(message);
          this.toast.error(message);
        }
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
        error: err => {
          const message = this.extractErrorMessage(err);
          this.error.set(message);
          this.toast.error(message);
        }
      });

    this.subscriptions.add(sub);
  }

  private async initialize(): Promise<void> {
    try {
      const me = await this.auth.ensureMe();
      this.role.set(me?.role ?? null);
    } catch {
      this.role.set(null);
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
    const role = this.role();
    if (role === 'ADMIN' || role === 'AGENT') {
      this.fetchAgents();
    } else {
      this.agents.set([]);
    }
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
      assigneeId: ticket.assignee?.id != null ? String(ticket.assignee.id) : '',
      category: ticket.category ?? '',
      relatedAssetId: ticket.relatedAssetId != null ? String(ticket.relatedAssetId) : ''
    });

    this.applyPermissions(ticket);
  }

  private applyPermissions(ticket: Ticket): void {
    const role = this.role();
    const isAdmin = role === 'ADMIN';
    const isAgent = role === 'AGENT';

    const canEditSubject = isAdmin || isAgent;
    const canEditDescription = canEditSubject;
    const canEditPriority = isAdmin || isAgent;
    const canAssign = isAdmin || isAgent;
    const canEditAsset = isAdmin || isAgent;
    const canEditCategory = isAdmin || isAgent;
    const canCancel = isAdmin || isAgent;

    this.canEditSubject.set(canEditSubject);
    this.canEditDescription.set(canEditDescription);
    this.canEditPriority.set(canEditPriority);
    this.canAssign.set(canAssign);
    this.canEditAsset.set(canEditAsset);
    this.canCancel.set(canCancel);
    this.canEditCategory.set(canEditCategory);

    this.toggleControl(this.form.controls.subject, canEditSubject, ticket.subject);
    this.toggleControl(this.form.controls.description, canEditDescription, ticket.description);
    this.toggleControl(this.form.controls.priority, canEditPriority, ticket.priority);
    this.toggleControl(
      this.form.controls.assigneeId,
      canAssign,
      ticket.assignee?.id != null ? String(ticket.assignee.id) : ''
    );
    this.toggleControl(
      this.form.controls.category,
      canEditCategory,
      ticket.category ?? ''
    );
    this.toggleControl(
      this.form.controls.relatedAssetId,
      canEditAsset,
      ticket.relatedAssetId != null ? String(ticket.relatedAssetId) : ''
    );

    if (canEditCategory) {
      this.ensureCategoriesLoaded(ticket.category ?? null);
    } else {
      this.categories.set([]);
      this.categoriesLoaded.set(false);
      this.categoriesLoading.set(false);
      this.categoriesError.set(null);
    }
  }

  private ensureCategoriesLoaded(selectedCategory: TicketCategory | null): void {
    if (this.categoriesLoaded()) {
      const available = this.categories();
      if (available.length === 0) {
        this.form.controls.category.disable({ emitEvent: false });
        this.form.controls.category.setValue('', { emitEvent: false });
        return;
      }

      const desired =
        selectedCategory && available.some(category => category.code === selectedCategory)
          ? selectedCategory
          : available[0].code;

      this.form.controls.category.enable({ emitEvent: false });
      this.form.controls.category.setValue(desired, { emitEvent: false });
      return;
    }

    if (this.categoriesLoading()) {
      return;
    }

    this.categoriesLoading.set(true);
    this.categoriesError.set(null);

    const sub = this.categoriesService
      .list()
      .pipe(finalize(() => this.categoriesLoading.set(false)))
      .subscribe({
        next: categories => {
          this.categories.set(categories);
          if (categories.length === 0) {
            this.categoriesLoaded.set(false);
            this.categoriesError.set('No categories available. Please contact support.');
            this.form.controls.category.disable({ emitEvent: false });
            this.form.controls.category.setValue('', { emitEvent: false });
            return;
          }

          this.categoriesLoaded.set(true);
          this.categoriesError.set(null);

          const desired =
            selectedCategory && categories.some(category => category.code === selectedCategory)
              ? selectedCategory
              : categories[0].code;

          this.form.controls.category.enable({ emitEvent: false });
          this.form.controls.category.setValue(desired, { emitEvent: false });
        },
        error: err => {
          const generic = this.extractErrorMessage(err);
          const fallback = 'Unable to load categories. Please try again later.';
          const message = generic === 'Unable to process your request. Please try again later.' ? fallback : generic;
          this.categories.set([]);
          this.categoriesLoaded.set(false);
          this.categoriesError.set(message);
          this.form.controls.category.disable({ emitEvent: false });
          this.form.controls.category.setValue('', { emitEvent: false });
          this.toast.error(message);
        }
      });

    this.subscriptions.add(sub);
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

  private normalizeCategory(value: unknown): TicketCategory | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const available = this.categories();
    if (available.length > 0 && !available.some(category => category.code === trimmed)) {
      return null;
    }
    return trimmed as TicketCategory;
  }

  private normalizeOptionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'number') {
      return Number.isNaN(value) ? undefined : value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? undefined : parsed;
    }

    return undefined;
  }

}

