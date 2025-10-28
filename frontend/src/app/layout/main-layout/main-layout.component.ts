import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { MeResponse } from '../../core/models/user';
import { ChangePasswordModalComponent } from '../../features/auth/change-password/change-password-modal.component';
import { ToastContainerComponent } from '../../shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, ChangePasswordModalComponent, ToastContainerComponent],
  templateUrl: './main-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent implements OnInit {
  readonly user = signal<MeResponse | null>(null);
  readonly loggingOut = signal(false);
  readonly showChangePasswordModal = signal(false);
  readonly forceChangePassword = signal(false);
  readonly isModalOpen = computed(() => this.showChangePasswordModal());
  readonly showUserMenu = signal(false);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const me = await this.authService.ensureMe();
    this.user.set(me);
    if (me?.mustChangePassword) {
      this.forceChangePassword.set(true);
      this.showChangePasswordModal.set(true);
    }
  }

  logout(): void {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);
    this.authService
      .logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => {
          this.authService.clearCache();
          this.router.navigateByUrl('/login');
        },
        error: () => {
          this.authService.clearCache();
          this.router.navigateByUrl('/login');
        }
      });
  }

  openChangePassword(): void {
    this.showChangePasswordModal.set(true);
  }

  handleModalClosed(): void {
    if (this.forceChangePassword()) {
      return;
    }
    this.showChangePasswordModal.set(false);
  }

  handlePasswordChanged(): void {
    this.forceChangePassword.set(false);
    const current = this.user();
    if (current) {
      this.user.set({ ...current, mustChangePassword: false });
    }
    this.showChangePasswordModal.set(false);
  }

  toggleUserMenu(): void {
    this.showUserMenu.set(!this.showUserMenu());
  }

  closeUserMenu(): void {
    this.showUserMenu.set(false);
  }
}
