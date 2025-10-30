import { Pipe, PipeTransform } from '@angular/core';
import { formatRelativeTime } from '../utils/time.util';

@Pipe({
  name: 'relativeTime',
  standalone: true
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatRelativeTime(value);
  }
}
