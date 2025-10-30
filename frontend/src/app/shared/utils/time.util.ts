const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const s = value as string;
  // If string contains timezone offset or Z, rely on built-in parser which understands offsets
  if (/[zZ]|[+-]\d{2}(:?\d{2})?$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Parse ISO local datetime (e.g. 2025-10-30T12:34:56 or with millis) as local time
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
  if (!m) {
    // fallback to Date parser
    const fallback = new Date(s);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const [, yy, mm, dd, hh, min, sec = '0', ms = '0'] = m;
  const parsed = new Date(
    Number(yy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min),
    Number(sec),
    Number(ms.padEnd(3, '0'))
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRelativeTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) {
    return '';
  }

  const diff = date.getTime() - Date.now();
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
