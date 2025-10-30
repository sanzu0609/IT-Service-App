import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateUtc',
  standalone: true
})
export class DateUtcPipe implements PipeTransform {
  transform(value: string | Date | null | undefined, fallback = '-'): string {
    if (!value) {
      return fallback;
    }

    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) {
      return fallback;
    }

    return date.toLocaleString();
  }
}
