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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { DepartmentResponse } from '../../../core/models/department';
import { DepartmentsService } from '../../../core/services/departments.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-department-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './department-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepartmentFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly toast = inject(ToastService);

  private readonly subscriptions = new Subscription();

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly conflictError = signal(false);
  readonly department = signal<DepartmentResponse | null>(null);

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required]],
    description: [''],
    active: [true]
  });

  readonly isEdit = computed(() => !!this.department());
  readonly title = computed(() =>
    this.isEdit() ? 'Cập nhật phòng ban' : 'Tạo phòng ban'
  );
  readonly submitLabel = computed(() =>
    this.isEdit() ? 'Lưu thay đổi' : 'Tạo mới'
  );

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      if (Number.isNaN(id)) {
        this.error.set('Không tìm thấy phòng ban.');
        return;
      }
      this.loadDepartment(id);
    } else {
      this.form.controls.active.disable();
      this.form.controls.active.setValue(true);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.conflictError.set(false);
    this.error.set(null);
    this.saving.set(true);

    if (this.isEdit()) {
      this.handleUpdate();
    } else {
      this.handleCreate();
    }
  }

  navigateBack(): void {
    this.router.navigate(['/admin/departments']);
  }

  private loadDepartment(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    const sub = this.departmentsService
      .get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: department => {
          this.department.set(department);
          this.patchForm(department);
        },
        error: err => {
          const message = this.resolveErrorMessage(err);
          this.error.set(message);
          this.toast.error(message);
        }
      });

    this.subscriptions.add(sub);
  }

  private patchForm(department: DepartmentResponse): void {
    this.form.controls.active.enable({ emitEvent: false });
    this.form.reset({
      code: department.code,
      name: department.name,
      description: department.description ?? '',
      active: department.active
    });
    this.form.controls.code.disable();
  }

  private handleCreate(): void {
    const raw = this.form.getRawValue();
    const normalizedCode = raw.code.trim().toUpperCase();
    const payload = {
      code: normalizedCode,
      name: raw.name.trim(),
      description: raw.description?.trim() ? raw.description.trim() : undefined,
      active: true
    };

    const sub = this.departmentsService
      .create(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Tạo phòng ban thành công.');
          this.navigateBack();
        },
        error: err => this.handleSubmitError(err)
      });

    this.subscriptions.add(sub);
  }

  private handleUpdate(): void {
    const current = this.department();
    if (!current) {
      this.saving.set(false);
      this.error.set('Không tìm thấy phòng ban.');
      return;
    }

    const raw = this.form.getRawValue();
    const patch = {
      name: raw.name.trim(),
      description: raw.description?.trim() ? raw.description.trim() : null,
      active: raw.active
    };

    const sub = this.departmentsService
      .update(current.id, patch)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: department => {
          this.department.set(department);
          this.toast.success('Cập nhật phòng ban thành công.');
          this.navigateBack();
        },
        error: err => this.handleSubmitError(err)
      });

    this.subscriptions.add(sub);
  }

  private handleSubmitError(error: unknown): void {
    if (this.isConflictError(error)) {
      this.conflictError.set(true);
      const message =
        'Mã hoặc tên phòng ban đã tồn tại. Vui lòng kiểm tra lại.';
      this.error.set(message);
      this.toast.error(message);
      return;
    }
    const message = this.resolveErrorMessage(error);
    this.error.set(message);
    this.toast.error(message);
  }

  private resolveErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof (error as { status?: unknown }).status === 'number' &&
      (error as { status: number }).status === 404
    ) {
      return 'Không tìm thấy phòng ban.';
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

    return 'Không thể lưu phòng ban lúc này. Vui lòng thử lại sau.';
  }

  private isConflictError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status?: unknown }).status === 409
    );
  }
}
