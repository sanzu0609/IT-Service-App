import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-users-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="flex w-full flex-col items-start gap-4 rounded-lg border border-dashed border-slate-300 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-slate-900">User Management</h2>
      <p class="text-sm text-slate-600">
        Admin tooling will be added during phase FE-0B.
      </p>
    </section>
  `
})
export class UsersPlaceholderComponent {}
