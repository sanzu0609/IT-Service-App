import { Pipe, PipeTransform } from '@angular/core';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

@Pipe({
  name: 'relativeTime',
  standalone: true
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const target = typeof value === 'string' ? new Date(value) : value;
    const targetTime = target.getTime();
    if (Number.isNaN(targetTime)) {
      return '';
    }

    const diff = targetTime - Date.now();
    const absDiff = Math.abs(diff);

    if (absDiff < MS_PER_MINUTE) {
      const seconds = Math.max(1, Math.round(absDiff / 1000));
      return diff >= 0 ? `Còn ${seconds} giây` : `Trễ ${seconds} giây`;
    }

    if (absDiff < MS_PER_HOUR) {
      const minutes = Math.round(absDiff / MS_PER_MINUTE);
      return diff >= 0 ? `Còn ${minutes} phút` : `Trễ ${minutes} phút`;
    }

    if (absDiff < MS_PER_DAY) {
      const hours = Math.round(absDiff / MS_PER_HOUR);
      return diff >= 0 ? `Còn ${hours} giờ` : `Trễ ${hours} giờ`;
    }

    const days = Math.round(absDiff / MS_PER_DAY);
    return diff >= 0 ? `Còn ${days} ngày` : `Trễ ${days} ngày`;
  }
}
