import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Page } from '../../../core/models/api';
import { Role, User } from '../../../core/models/user';
import { UsersService, UsersListParams } from '../../../core/services/users.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './users-list.component.html'
})
export class UsersListComponent implements OnInit, OnDestroy {
  private readonly usersService = inject(UsersService);

  readonly roles: Role[] = ['ADMIN', 'AGENT', 'END_USER'];
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly page = signal<Page<User> | null>(null);

  filters: UsersListParams = {
    page: 0,
    size: 10,
    role: undefined,
    active: undefined,
    q: undefined,
    sort: undefined
  };

  private subscription: Subscription | null = null;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  trackById(_: number, user: User): number {
    return user.id;
  }

  resetFilters(): void {
    this.filters = { ...this.filters, page: 0, role: undefined, active: undefined, q: undefined };
    this.load();
  }

  load(page: number = this.filters.page ?? 0): void {
    this.subscription?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.filters.page = page;

    this.subscription = this.usersService
      .list(this.filters)
      .subscribe({
        next: response => {
          this.page.set(response);
          this.loading.set(false);
        },
        error: err => {
          this.error.set(parseError(err));
          this.loading.set(false);
        }
      });
  }

  pageChange(direction: 1 | -1): void {
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

  openReset(_: User): void {
    // placeholder for FE-0B.5
  }
}

function parseError(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'error' in err) {
    const payload = (err as { error: { message?: string; code?: string } }).error;
    if (typeof payload?.message === 'string') {
      return payload.message;
    }
  }
  return 'Unable to load users. Please try again.';
}
