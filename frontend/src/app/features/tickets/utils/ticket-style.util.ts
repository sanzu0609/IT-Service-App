import { TicketStatus, SlaFlag } from '../../../core/models/ticket';

const BASE_BADGE_CLASS = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';

export function getStatusClass(status?: TicketStatus | null): string {
  const base = BASE_BADGE_CLASS;

  switch (status) {
    case 'NEW':
    case 'IN_PROGRESS':
      return `${base} bg-sky-600 text-white`;
    case 'ON_HOLD':
      return `${base} bg-amber-500 text-white`;
    case 'RESOLVED':
    case 'CLOSED':
      return `${base} bg-emerald-600 text-white`;
    case 'REOPENED':
    case 'CANCELLED':
      return `${base} bg-rose-600 text-white`;
    default:
      return `${base} bg-slate-200 text-slate-700`;
  }
}

export function getSlaClass(flag?: SlaFlag | null): string {
  const base = BASE_BADGE_CLASS;

  switch (flag) {
    case 'OK':
      return `${base} bg-slate-200 text-slate-700`;
    case 'NEAR':
      return `${base} bg-amber-200 text-amber-800`;
    case 'BREACHED':
      return `${base} bg-rose-200 text-rose-800`;
    default:
      return `${base} bg-slate-100 text-slate-500`;
  }
}
