import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Page } from '../../../core/models/api';
import { DepartmentResponse } from '../../../core/models/department';
import { DepartmentsService } from '../../../core/services/departments.service';

type ActiveFilter = '' | 'true' | 'false';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './department-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepartmentListComponent implements OnInit {
  private readonly departmentsService = inject(DepartmentsService);

  readonly loading = signal(false);
  readonly page = signal<Page<DepartmentResponse> | null>(null);
  readonly error = signal<string | null>(null);
  readonly toggling = signal<number[]>([]);

  filters: { q: string; active: ActiveFilter } = {
    q: '',
    active: ''
  };

  readonly pageSizeOptions = [10, 20, 50];
  pageIndex = 0;
  pageSize = 20;

  ngOnInit(): void {
    this.loadPage(0);
  }

  applyFilters(): void {
    if (this.loading()) {
      return;
    }
    this.pageIndex = 0;
    this.loadPage(0);
  }

  resetFilters(): void {
    if (this.loading()) {
      return;
    }
    this.filters = { q: '', active: '' };
    this.pageIndex = 0;
    this.loadPage(0);
  }

  changePage(target: number): void {
    if (this.loading() || target === this.pageIndex) {
      return;
    }

    const totalPages = this.page()?.totalPages ?? 0;
    if (target < 0 || target >= totalPages) {
      return;
    }

    this.loadPage(target);
  }

  changePageSize(size: number | string): void {
    const parsed = Number(size);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return;
    }
    if (this.loading() || parsed === this.pageSize) {
      return;
    }
    this.pageSize = parsed;
    this.pageIndex = 0;
    this.loadPage(0);
  }

  isToggling(id: number): boolean {
    return this.toggling().includes(id);
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
        next: () => this.loadPage(this.pageIndex),
        error: err => this.error.set(this.resolveErrorMessage(err))
      });
  }

  trackById(_index: number, item: DepartmentResponse): number {
    return item.id;
  }

  private loadPage(pageIndex: number): void {
    this.loading.set(true);
    this.error.set(null);

    const q = this.filters.q.trim();
    const active =
      this.filters.active === ''
        ? undefined
        : this.filters.active === 'true';

    this.departmentsService
      .list({
        q: q ? q : undefined,
        active,
        page: pageIndex,
        size: this.pageSize,
        sort: 'createdAt,desc'
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: result => {
          this.page.set(result);
          this.pageIndex = result.number;
          this.pageSize = result.size;
        },
        error: err => {
          this.error.set(this.resolveErrorMessage(err));
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
      if (typeof payload?.message === 'string' && payload.message.trim()) {
        return payload.message;
      }
    }
    return 'Không thể tải danh sách phòng ban. Vui lòng thử lại sau.';
  }
}
