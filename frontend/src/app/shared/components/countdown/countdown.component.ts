import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, Input, effect, signal } from '@angular/core';
import { formatRelativeTime, toDate } from '../../utils/time.util';

@Component({
  selector: 'app-countdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="block text-xs" [ngClass]="compact ? '' : 'text-slate-500'" *ngIf="text() as value">
      {{ value }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CountdownComponent {
  @Input()
  compact = false;
  private readonly targetSignal = signal<Date | null>(null);
  private readonly textSignal = signal<string>('');
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly destroyRef: DestroyRef) {
    effect(() => {
      const target = this.targetSignal();
      this.updateText(target);
      this.resetTimer(target);
    });

    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  @Input()
  set target(value: string | Date | null | undefined) {
    this.targetSignal.set(toDate(value));
  }

  text(): string {
    return this.textSignal();
  }

  private updateText(target: Date | null): void {
    this.textSignal.set(formatRelativeTime(target));
  }

  private resetTimer(target: Date | null): void {
    this.clearTimer();
    if (!target) {
      return;
    }

    const diff = Math.abs(target.getTime() - Date.now());
    const interval = diff > 60_000 ? 60_000 : diff > 10_000 ? 10_000 : 1_000;

    this.timer = setInterval(() => {
      this.updateText(this.targetSignal());
    }, interval);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
