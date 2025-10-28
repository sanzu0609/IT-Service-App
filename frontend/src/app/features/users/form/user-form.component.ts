import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { UsersService, CreateUserPayload, UpdateUserPayload } from '../../../core/services/users.service';
import { User } from '../../../core/models/user';
import { DepartmentsService } from '../../../core/services/departments.service';
import { DepartmentMinimalResponse } from '../../../core/models/department';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form.component.html'
})
export class UserFormComponent implements OnInit, OnChanges, OnDestroy {
  @Input() open = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() user: User | null = null;
  @Input() loading = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly departmentsService = inject(DepartmentsService);

  readonly roles = ['ADMIN', 'AGENT', 'END_USER'] as const;

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.maxLength(100)]],
    role: this.fb.nonNullable.control<'ADMIN' | 'AGENT' | 'END_USER'>('AGENT', Validators.required),
    departmentId: this.fb.control<number | null | undefined>(undefined),
    active: this.fb.nonNullable.control<boolean>(true)
  });

  saving = false;
  errorMessage = '';
  departments: DepartmentMinimalResponse[] = [];
  departmentsLoading = false;
  departmentsError: string | null = null;

  private departmentsSub: Subscription | null = null;

  get title(): string {
    return this.mode === 'edit' ? 'Edit user' : 'Create user';
  }

  get formDisabled(): boolean {
    return this.loading || this.saving;
  }

  ngOnInit(): void {
    this.loadDepartments();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] || changes['mode'] || changes['open']) {
      this.applyState();
    }

    if (changes['open'] && !this.open) {
      this.resetForm();
    }
  }

  ngOnDestroy(): void {
    this.departmentsSub?.unsubscribe();
  }

  submit(): void {
    if (this.form.invalid || this.saving || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const payloads = this.buildPayloads();
    const request$ = this.mode === 'edit' && this.user
      ? this.usersService.update(this.user.id, payloads.updatePayload)
      : this.usersService.create(payloads.createPayload!);

    request$
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.saved.emit();
          this.resetForm();
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

  retryLoadDepartments(): void {
    this.loadDepartments();
  }

  private buildPayloads(): { createPayload?: CreateUserPayload; updatePayload: UpdateUserPayload } {
    const raw = this.form.getRawValue();
    const trimmedEmail = raw.email.trim();
    const trimmedFullName = raw.fullName?.trim();
    const departmentId =
      raw.departmentId === undefined || raw.departmentId === null
        ? undefined
        : Number(raw.departmentId);

    const updatePayload: UpdateUserPayload = {
      email: trimmedEmail,
      fullName: trimmedFullName ? trimmedFullName : undefined,
      role: raw.role,
      departmentId,
      active: raw.active
    };

    if (this.mode === 'edit') {
      return { updatePayload };
    }

    const createPayload: CreateUserPayload = {
      username: raw.username.trim(),
      email: trimmedEmail,
      fullName: trimmedFullName ? trimmedFullName : undefined,
      role: raw.role,
      departmentId,
      active: raw.active
    };

    return { createPayload, updatePayload };
  }

  private applyState(): void {
    if (!this.open) {
      return;
    }

    if (this.mode === 'edit' && this.user) {
      this.ensureDepartmentOption(this.user.departmentId ?? undefined);
      this.form.patchValue({
        username: this.user.username,
        email: this.user.email,
        fullName: this.user.fullName || '',
        role: this.user.role,
        departmentId: this.user.departmentId ?? undefined,
        active: this.user.active
      });
      this.form.controls.username.disable();
    } else if (this.mode === 'create') {
      this.resetForm();
      this.form.controls.username.enable();
    }
  }

  private resetForm(): void {
    this.form.reset({
      username: '',
      email: '',
      fullName: '',
      role: 'AGENT',
      departmentId: undefined,
      active: true
    });
    this.form.controls.username.enable();
    this.errorMessage = '';
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
    return 'Unable to save user. Please try again.';
  }

  private loadDepartments(): void {
    this.departmentsLoading = true;
    this.departmentsError = null;
    this.departmentsSub?.unsubscribe();

    this.departmentsSub = this.departmentsService
      .minimal()
      .pipe(finalize(() => (this.departmentsLoading = false)))
      .subscribe({
        next: departments => {
          this.departments = departments ?? [];
          this.ensureDepartmentOption(this.user?.departmentId ?? undefined);
        },
        error: err => {
          this.departments = [];
          this.departmentsError = this.resolveDepartmentsError(err);
        }
      });
  }

  private ensureDepartmentOption(departmentId: number | null | undefined): void {
    if (
      departmentId === undefined ||
      departmentId === null ||
      !Array.isArray(this.departments) ||
      !this.departments.length
    ) {
      return;
    }
    const exists = this.departments.some(dept => dept.id === departmentId);
    if (exists) {
      return;
    }
    this.departments = [
      ...this.departments,
      {
        id: departmentId,
        code: 'INACTIVE',
        name: `Department #${departmentId}`
      }
    ];
  }

  private resolveDepartmentsError(error: unknown): string {
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
    return 'Unable to load departments. Please try again.';
  }
}
