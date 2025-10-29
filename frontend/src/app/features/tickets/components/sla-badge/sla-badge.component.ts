import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { SlaFlag } from '../../../core/models/ticket';

@Component({
  selector: 'app-sla-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sla-badge.component.html',
  styleUrls: ['./sla-badge.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlaBadgeComponent {
  private readonly flagSignal = signal<SlaFlag | undefined>(undefined);

  @Input()
  set flag(value: SlaFlag | undefined | null) {
    this.flagSignal.set(value ?? undefined);
  }

  readonly classes = computed(() => {
    const flag = this.flagSignal();
    switch (flag) {
      case 'OK':
        return 'bg-slate-200 text-slate-700';
      case 'NEAR':
        return 'bg-amber-200 text-amber-800';
      case 'BREACHED':
        return 'bg-rose-200 text-rose-800';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  });

  readonly label = computed(() => this.flagSignal() ?? 'N/A');
}
