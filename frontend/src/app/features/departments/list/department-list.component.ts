import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      class="flex w-full flex-col items-start gap-4 rounded-lg border border-dashed border-slate-300 bg-white p-6 shadow-sm"
    >
      <h2 class="text-lg font-semibold text-slate-900">Department Management</h2>
      <p class="text-sm text-slate-600">
        Department list view will be implemented in upcoming phases (FE-DEP.3).
      </p>
    </section>
  `
})
export class DepartmentListComponent {}

