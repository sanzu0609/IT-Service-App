import { User } from './user';

export type TicketStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'ON_HOLD'
  | 'REOPENED'
  | 'CANCELLED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SlaFlag = 'OK' | 'NEAR' | 'BREACHED';

export type TicketCategory =
  | 'HARDWARE'
  | 'SOFTWARE'
  | 'NETWORK'
  | 'SECURITY'
  | 'ACCESS'
  | 'SERVICES';

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  HARDWARE: 'Hardware',
  SOFTWARE: 'Software',
  NETWORK: 'Network',
  SECURITY: 'Security',
  ACCESS: 'Access',
  SERVICES: 'Services'
};

export interface Ticket {
  id: number;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  reporter?: User | null;
  assignee?: User | null;
  category: TicketCategory;
  categoryLabel?: string | null;
  relatedAssetId?: number | null;
  slaResponseDeadline?: string | null;
  slaResolutionDeadline?: string | null;
  slaFlag?: SlaFlag | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: number;
  ticketId: number;
  author?: User | null;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TicketSummary {
  id: number;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority: Priority;
  category: TicketCategory;
  slaFlag?: SlaFlag | null;
  createdAt: string;
  assigneeId?: number | null;
}
