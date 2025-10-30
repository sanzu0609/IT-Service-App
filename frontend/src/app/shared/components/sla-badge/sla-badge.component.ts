import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SlaFlag } from '../../../core/models/ticket';

type SlaBadgeClassKey = SlaFlag | 'UNKNOWN';

@Component({
  selector: 'app-sla-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center rounded px-2 py-1 text-xs font-semibold transition-colors"
      [ngClass]="badgeClass"
      [attr.aria-label]="ariaLabel"
    >
      {{ displayValue }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlaBadgeComponent {
  private static readonly CLASS_MAP: Record<SlaBadgeClassKey, string> = {
    OK: 'bg-slate-200 text-slate-700',
    NEAR: 'bg-amber-200 text-amber-800',
    BREACHED: 'bg-rose-200 text-rose-800',
    UNKNOWN: 'bg-slate-100 text-slate-500'
  };

  @Input()
  flag: SlaFlag | null | undefined;

  get badgeClass(): string {
    return SlaBadgeComponent.CLASS_MAP[this.flag ?? 'UNKNOWN'];
  }

  get displayValue(): string {
    return this.flag ?? 'N/A';
  }

  get ariaLabel(): string {
    switch (this.flag) {
      case 'OK':
        return 'SLA on track';
      case 'NEAR':
        return 'SLA near breach';
      case 'BREACHED':
        return 'SLA breached';
      default:
        return 'SLA status unknown';
    }
  }
}
