import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { TicketStatus } from '../../../core/models/ticket';

@Component({
  selector: 'app-ticket-status-chip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-status-chip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketStatusChipComponent {
  private readonly statusSignal = signal<TicketStatus | undefined>(undefined);

  @Input()
  set status(value: TicketStatus | undefined | null) {
    this.statusSignal.set(value ?? undefined);
  }

  readonly classes = computed(() => {
    const status = this.statusSignal();
    if (!status) {
      return 'bg-slate-200 text-slate-600';
    }

    switch (status) {
      case 'NEW':
      case 'IN_PROGRESS':
        return 'bg-sky-600 text-white';
      case 'ON_HOLD':
        return 'bg-amber-500 text-white';
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-600 text-white';
      case 'REOPENED':
      case 'CANCELLED':
        return 'bg-rose-600 text-white';
      default:
        return 'bg-slate-200 text-slate-600';
    }
  });

  readonly label = computed(() => this.statusSignal() ?? 'UNKNOWN');
}
