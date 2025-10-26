import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html'
})
export class ChangePasswordComponent {
  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', Validators.required]
  });

  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly usersService: UsersService,
    private readonly authService: AuthService
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirm } = this.form.getRawValue();
    if (newPassword !== confirm) {
      this.form.controls.confirm.setErrors({ mismatch: true });
      this.form.controls.confirm.markAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.usersService
      .changePassword({ currentPassword, newPassword })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: async () => {
          this.successMessage = 'Đổi mật khẩu thành công.';
          this.authService.clearCache();
          await this.authService.ensureMe();
        },
        error: error => {
          this.errorMessage = this.resolveErrorMessage(error);
        }
      });
  }

  get passwordMismatch(): boolean {
    return this.form.controls.confirm.hasError('mismatch') && this.form.controls.confirm.touched;
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
    return 'Không thể đổi mật khẩu. Vui lòng thử lại.';
  }
}
