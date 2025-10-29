import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { SlaFlag } from '../../../../core/models/ticket';
import { getSlaClass } from '../../utils/ticket-style.util';

@Component({
  selector: 'app-sla-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sla-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlaBadgeComponent {
  private readonly flagSignal = signal<SlaFlag | undefined>(undefined);

  @Input()
  set flag(value: SlaFlag | undefined | null) {
    this.flagSignal.set(value ?? undefined);
  }

  readonly classes = computed(() => getSlaClass(this.flagSignal()));
  readonly label = computed(() => this.flagSignal() ?? 'N/A');
}
