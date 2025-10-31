import { Pipe, PipeTransform } from '@angular/core';
import { toDate } from '../utils/time.util';

@Pipe({
  name: 'dateUtc',
  standalone: true
})
export class DateUtcPipe implements PipeTransform {
  transform(value: string | Date | null | undefined, fallback = '-'): string {
    if (!value) {
      return fallback;
    }

    const date = toDate(value);
    if (!date) {
      return fallback;
    }

    return date.toLocaleString();
  }
}
