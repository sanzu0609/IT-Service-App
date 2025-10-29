import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { TicketStatus } from '../../../core/models/ticket';
import { getStatusClass } from '../utils/ticket-style.util';

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

  readonly classes = computed(() => getStatusClass(this.statusSignal()));
  readonly label = computed(() => this.statusSignal() ?? 'UNKNOWN');
}
