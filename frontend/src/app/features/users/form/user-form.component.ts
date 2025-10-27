import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { Role, User } from '../../../core/models/user';
import {
  CreateUserPayload,
  UpdateUserPayload,
  UsersService
} from '../../../core/services/users.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './user-form.component.html'
})
export class UserFormComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);

  readonly roles: Role[] = ['ADMIN', 'AGENT', 'END_USER'];
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saved = signal(false);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.maxLength(100)]],
    role: this.fb.nonNullable.control<Role>('AGENT', Validators.required),
    departmentId: this.fb.control<number | null | undefined>(undefined),
    active: this.fb.nonNullable.control<boolean>(true)
  });

  userId: number | null = null;
  private subscription: Subscription | null = null;

  get title(): string {
    return this.userId ? 'Edit user' : 'Create user';
  }

  get isEdit(): boolean {
    return this.userId !== null;
  }

  ngOnInit(): void {
    this.subscription = this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam && idParam !== 'new') {
        this.userId = Number(idParam);
        this.loadUser(this.userId);
      } else {
        this.userId = null;
        this.form.reset({
          username: '',
          email: '',
          fullName: '',
          role: 'AGENT',
          departmentId: undefined,
          active: true
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const payload = this.buildPayload();

    const request$ = this.userId
      ? this.usersService.update(this.userId, payload as UpdateUserPayload)
      : this.usersService.create(payload as CreateUserPayload);

    request$
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.saved.set(true);
          this.router.navigate(['/admin/users']);
        },
        error: err => {
          this.error.set(parseError(err));
        }
      });
  }

  private buildPayload(): CreateUserPayload | UpdateUserPayload {
    const raw = this.form.getRawValue();
    const base = {
      email: raw.email.trim(),
      fullName: raw.fullName?.trim() || undefined,
      role: raw.role,
      departmentId: raw.departmentId ?? undefined,
      active: raw.active
    };

    if (this.userId) {
      return base;
    }

    return {
      username: raw.username.trim(),
      ...base
    } as CreateUserPayload;
  }

  private loadUser(id: number): void {
    this.loading.set(true);
    this.usersService
      .get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: user => this.populateForm(user),
        error: err => {
          this.error.set(parseError(err));
        }
      });
  }

  private populateForm(user: User): void {
    this.form.patchValue({
      username: user.username,
      email: user.email,
      fullName: user.fullName || '',
      role: user.role,
      departmentId: user.departmentId ?? undefined,
      active: user.active
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
  return 'Something went wrong. Please try again.';
}
