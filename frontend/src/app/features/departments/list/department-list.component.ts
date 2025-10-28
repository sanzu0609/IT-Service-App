import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Page } from '../../../core/models/api';
import { DepartmentResponse } from '../../../core/models/department';
import { DepartmentsService } from '../../../core/services/departments.service';
import { ToastService } from '../../../core/services/toast.service';
import { DepartmentFormComponent } from '../form/department-form.component';

type ActiveFilter = '' | 'true' | 'false';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DepartmentFormComponent],
  templateUrl: './department-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepartmentListComponent implements OnInit, OnDestroy {
  private readonly departmentsService = inject(DepartmentsService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly page = signal<Page<DepartmentResponse> | null>(null);
  readonly error = signal<string | null>(null);
  readonly toggling = signal<number[]>([]);
  readonly statusMessage = signal<string | null>(null);

  readonly formOpen = signal(false);
  readonly formMode = signal<'create' | 'edit'>('create');
  readonly formLoading = signal(false);
  readonly editingDepartment = signal<DepartmentResponse | null>(null);

  filters: { q?: string; active?: ActiveFilter; page: number; size: number } = {
    q: '',
    active: '',
    page: 0,
    size: 10
  };

  private listSub: Subscription | null = null;
  private formSub: Subscription | null = null;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.listSub?.unsubscribe();
    this.formSub?.unsubscribe();
  }

  trackById(_: number, dept: DepartmentResponse): number {
    return dept.id;
  }

  applyFilters(): void {
    if (this.loading()) {
      return;
    }
    this.filters.page = 0;
    this.statusMessage.set(null);
    this.load(0);
  }

  resetFilters(): void {
    if (this.loading()) {
      return;
    }
    this.filters = { ...this.filters, q: '', active: '', page: 0 };
    this.statusMessage.set(null);
    this.load(0);
  }

  changePage(direction: 1 | -1): void {
    const current = this.page();
    if (!current) {
      return;
    }
    const next = current.number + direction;
    if (next < 0 || next >= current.totalPages) {
      return;
    }
    this.load(next);
  }

  changePageSize(size: number | string): void {
    const parsed = Number(size);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return;
    }
    this.filters.size = parsed;
    this.filters.page = 0;
    this.statusMessage.set(null);
    this.load(0);
  }

  openCreate(): void {
    this.statusMessage.set(null);
    this.formMode.set('create');
    this.editingDepartment.set(null);
    this.formLoading.set(false);
    this.formOpen.set(true);
  }

  openEdit(row: DepartmentResponse): void {
    this.statusMessage.set(null);
    this.formMode.set('edit');
    this.formLoading.set(true);
    this.formOpen.set(true);
    this.editingDepartment.set(null);

    this.formSub?.unsubscribe();
    this.formSub = this.departmentsService.get(row.id).subscribe({
      next: detail => {
        this.editingDepartment.set(detail);
        this.formLoading.set(false);
      },
      error: err => {
        const message = this.resolveErrorMessage(err);
        this.toast.error(message);
        this.error.set(message);
        this.formLoading.set(false);
        this.formOpen.set(false);
      }
    });
  }

  handleFormSaved(): void {
    this.formOpen.set(false);
    this.formLoading.set(false);
    this.editingDepartment.set(null);
    this.statusMessage.set('Department saved successfully.');
    this.load(this.filters.page);
  }

  handleFormClosed(): void {
    this.formOpen.set(false);
    this.formLoading.set(false);
    this.editingDepartment.set(null);
  }

  toggleActive(department: DepartmentResponse): void {
    if (this.loading() || this.isToggling(department.id)) {
      return;
    }

    this.error.set(null);
    this.toggling.set([...this.toggling(), department.id]);

    this.departmentsService
      .update(department.id, { active: !department.active })
      .pipe(
        finalize(() => {
          this.toggling.set(this.toggling().filter(id => id !== department.id));
        })
      )
      .subscribe({
        next: () => {
          this.toast.success('Department status updated.');
          this.statusMessage.set('Department status updated.');
          this.load(this.filters.page);
        },
        error: err => {
          const message = this.resolveErrorMessage(err);
          this.error.set(message);
          this.statusMessage.set(null);
          this.toast.error(message);
        }
      });
  }

  isToggling(id: number): boolean {
    return this.toggling().includes(id);
  }

  private load(page: number = this.filters.page): void {
    this.listSub?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);

    this.filters.page = page;

    const params = {
      q: this.filters.q?.trim() || undefined,
      active:
        this.filters.active === ''
          ? undefined
          : this.filters.active === 'true',
      page: this.filters.page,
      size: this.filters.size,
      sort: 'createdAt,desc'
    };

    this.listSub = this.departmentsService
      .list(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response: Page<DepartmentResponse>) => {
          this.page.set(response);
        },
        error: err => {
          const message = this.resolveErrorMessage(err);
          this.error.set(message);
          this.statusMessage.set(null);
          this.toast.error(message);
          this.page.set(null);
        }
      });
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
    return 'Unable to load departments. Please try again.';
  }
}
