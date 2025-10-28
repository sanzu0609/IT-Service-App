import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DepartmentResponse } from '../../../core/models/department';
import { DepartmentsService } from '../../../core/services/departments.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-department-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './department-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepartmentFormComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() department: DepartmentResponse | null = null;
  @Input() loading = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly toast = inject(ToastService);

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required]],
    description: [''],
    active: this.fb.nonNullable.control<boolean>(true)
  });

  saving = false;
  errorMessage = '';
  private submitSub: Subscription | null = null;

  get title(): string {
    return this.mode === 'edit' ? 'Edit department' : 'Create department';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Save changes' : 'Create';
  }

  get formDisabled(): boolean {
    return this.loading || this.saving;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] || changes['mode'] || changes['department']) {
      this.applyState();
    }

    if (changes['open'] && !this.open) {
      this.resetForm();
    }
  }

  ngOnDestroy(): void {
    this.submitSub?.unsubscribe();
  }

  submit(): void {
    if (this.form.invalid || this.formDisabled) {
      this.form.markAllAsTouched();
      return;
    }

    const { code, name, description, active } = this.form.getRawValue();
    const trimmedName = name.trim();
    const trimmedDescription = description?.trim();

    if (!trimmedName) {
      this.form.controls.name.setErrors({ required: true });
      this.form.controls.name.markAsTouched();
      return;
    }

    this.errorMessage = '';
    this.saving = true;
    this.submitSub?.unsubscribe();

    if (this.mode === 'create') {
      const payload = {
        code: code.trim().toUpperCase(),
        name: trimmedName,
        description: trimmedDescription ? trimmedDescription : undefined,
        active: true
      };

      this.submitSub = this.departmentsService
        .create(payload)
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: () => {
            this.toast.success('Department created successfully.');
            this.saved.emit();
            this.resetForm();
          },
          error: err => {
            this.errorMessage = this.resolveErrorMessage(err);
          }
        });
      return;
    }

    if (!this.department) {
      this.errorMessage = 'Department not found.';
      this.saving = false;
      return;
    }

    const patch = {
      name: trimmedName,
      description: trimmedDescription ? trimmedDescription : null,
      active
    };

    this.submitSub = this.departmentsService
      .update(this.department.id, patch)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.toast.success('Department updated successfully.');
          this.saved.emit();
        },
        error: err => {
          this.errorMessage = this.resolveErrorMessage(err);
        }
      });
  }

  close(): void {
    if (this.saving) {
      return;
    }
    this.resetForm();
    this.closed.emit();
  }

  private applyState(): void {
    if (!this.open) {
      return;
    }

    if (this.mode === 'edit' && this.department) {
      this.form.enable({ emitEvent: false });
      this.form.reset({
        code: this.department.code,
        name: this.department.name,
        description: this.department.description ?? '',
        active: this.department.active
      });
      this.form.controls.code.disable();
      this.form.controls.active.enable();
    } else if (this.mode === 'edit') {
      this.form.reset({
        code: '',
        name: '',
        description: '',
        active: true
      });
      this.form.controls.code.disable();
      this.form.controls.active.enable();
    } else if (this.mode === 'create') {
      this.resetForm();
      this.form.controls.code.enable();
      this.form.controls.active.disable();
      this.form.controls.active.setValue(true, { emitEvent: false });
    }
  }

  private resetForm(): void {
    this.form.reset({
      code: '',
      name: '',
      description: '',
      active: true
    });
    this.form.controls.code.enable();
    this.form.controls.active.disable();
    this.errorMessage = '';
    this.saving = false;
  }

  private resolveErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status?: unknown }).status === 409
    ) {
      return 'Department code or name already exists.';
    }

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

    return 'Unable to save department. Please try again.';
  }
}

