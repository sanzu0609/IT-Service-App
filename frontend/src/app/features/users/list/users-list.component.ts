import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Page } from '../../../core/models/api';
import { Role, User } from '../../../core/models/user';
import { UsersService, UsersListParams } from '../../../core/services/users.service';
import { UserFormComponent } from '../form/user-form.component';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, UserFormComponent],
  templateUrl: './users-list.component.html'
})
export class UsersListComponent implements OnInit, OnDestroy {
  private readonly usersService = inject(UsersService);

  readonly roles: Role[] = ['ADMIN', 'AGENT', 'END_USER'];
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly page = signal<Page<User> | null>(null);
  readonly resetProcessing = signal(false);
  readonly resetMessage = signal<string | null>(null);
  readonly resetError = signal<string | null>(null);
  resetTempPasswordValue = '';
  readonly formOpen = signal(false);
  readonly formMode = signal<'create' | 'edit'>('create');
  readonly formLoading = signal(false);
  readonly editingUser = signal<User | null>(null);

  filters: UsersListParams = {
    page: 0,
    size: 10,
    role: undefined,
    active: undefined,
    q: undefined,
    sort: undefined
  };

  confirmResetFor = signal<User | null>(null);

  private subscription: Subscription | null = null;
  private formSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.formSubscription?.unsubscribe();
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

  openCreate(): void {
    this.formMode.set('create');
    this.editingUser.set(null);
    this.formLoading.set(false);
    this.formOpen.set(true);
  }

  openEdit(user: User): void {
    this.formMode.set('edit');
    this.formLoading.set(true);
    this.formOpen.set(true);
    this.formSubscription?.unsubscribe();
    this.formSubscription = this.usersService.get(user.id).subscribe({
      next: detail => {
        this.editingUser.set(detail);
        this.formLoading.set(false);
      },
      error: err => {
        this.error.set(parseError(err));
        this.formLoading.set(false);
        this.formOpen.set(false);
      }
    });
  }

  handleFormSaved(): void {
    this.formOpen.set(false);
    this.resetMessage.set('User saved successfully.');
    this.load(this.filters.page ?? 0);
  }

  handleFormClosed(): void {
    this.formOpen.set(false);
    this.editingUser.set(null);
    this.formLoading.set(false);
  }

  openReset(user: User): void {
    this.resetMessage.set(null);
    this.resetError.set(null);
    this.resetTempPasswordValue = '';
    this.confirmResetFor.set(user);
  }

  closeReset(): void {
    if (this.resetProcessing()) {
      return;
    }
    this.confirmResetFor.set(null);
    this.resetTempPasswordValue = '';
    this.resetError.set(null);
  }

  confirmReset(): void {
    const user = this.confirmResetFor();
    if (!user) {
      return;
    }

    const tempPassword = this.resetTempPasswordValue.trim();
    if (!tempPassword) {
      this.resetError.set('Please enter a temporary password.');
      return;
    }
    this.resetError.set(null);

    this.resetProcessing.set(true);
    this.usersService
      .resetPassword(user.id, tempPassword)
      .subscribe({
        next: () => {
          this.resetProcessing.set(false);
          this.resetMessage.set(`Temporary password set. Communicate "${tempPassword}" to ${user.username}; they must change it on next login.`);
          this.confirmResetFor.set(null);
          this.resetTempPasswordValue = '';
          this.load(this.filters.page ?? 0);
        },
        error: err => {
          this.resetProcessing.set(false);
          this.resetMessage.set(parseError(err));
          this.confirmResetFor.set(null);
          this.resetTempPasswordValue = '';
        }
      });
  }
}

function parseError(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'error' in err) {
    const payload = (err as { error: { message?: string; code?: string } }).error;
    if (typeof payload?.message === 'string') {
      return payload.message;
    }
  }
  return 'Unable to process request. Please try again.';
}
