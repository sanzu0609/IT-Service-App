import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-tickets-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="flex w-full flex-col items-start gap-4 rounded-lg border border-dashed border-slate-300 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-slate-900">Tickets</h2>
      <p class="text-sm text-slate-600">
        Tickets workspace will arrive in the next delivery phase.
      </p>
    </section>
  `
})
export class TicketsPlaceholderComponent {}
