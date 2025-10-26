import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { MeResponse } from '../../core/models/user';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './main-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent implements OnInit {
  user: MeResponse | null = null;
  loggingOut = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.user = await this.authService.ensureMe();
  }

  logout(): void {
    if (this.loggingOut) {
      return;
    }

    this.loggingOut = true;
    this.authService
      .logout()
      .pipe(finalize(() => (this.loggingOut = false)))
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
}
