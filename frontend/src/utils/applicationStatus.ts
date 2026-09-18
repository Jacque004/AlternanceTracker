import type { Application } from '../types';

export const APPLICATION_STATUSES = [
  'to_apply',
  'pending',
  'followed_up',
  'interview',
  'accepted',
  'rejected',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const PIPELINE_COLUMNS: {
  key: ApplicationStatus;
  label: string;
  hint: string;
  badgeClass: string;
  columnAccent: string;
  color: string;
}[] = [
  {
    key: 'to_apply',
    label: 'À postuler',
    hint: 'Offres repérées',
    badgeClass: 'bg-slate-100 text-slate-800',
    columnAccent: 'border-t-slate-400',
    color: '#64748b',
  },
  {
    key: 'pending',
    label: 'Envoyée',
    hint: 'En attente de réponse',
    badgeClass: 'bg-amber-100 text-amber-800',
    columnAccent: 'border-t-amber-400',
    color: '#d97706',
  },
  {
    key: 'followed_up',
    label: 'Relancée',
    hint: 'Suivi envoyé',
    badgeClass: 'bg-orange-100 text-orange-900',
    columnAccent: 'border-t-orange-400',
    color: '#ea580c',
  },
  {
    key: 'interview',
    label: 'Entretien',
    hint: 'À préparer',
    badgeClass: 'bg-blue-100 text-blue-800',
    columnAccent: 'border-t-blue-500',
    color: '#2563eb',
  },
  {
    key: 'accepted',
    label: 'Offre',
    hint: 'Acceptée',
    badgeClass: 'bg-green-100 text-green-800',
    columnAccent: 'border-t-green-500',
    color: '#16a34a',
  },
  {
    key: 'rejected',
    label: 'Refus',
    hint: 'Clôturée',
    badgeClass: 'bg-red-100 text-red-800',
    columnAccent: 'border-t-red-400',
    color: '#dc2626',
  },
];

const BY_KEY = Object.fromEntries(PIPELINE_COLUMNS.map((c) => [c.key, c])) as Record<
  ApplicationStatus,
  (typeof PIPELINE_COLUMNS)[number]
>;

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function normalizeApplicationStatus(status: string | undefined): ApplicationStatus {
  if (status && isApplicationStatus(status)) return status;
  return 'pending';
}

export function applicationStatusLabel(status: string | undefined): string {
  const key = normalizeApplicationStatus(status);
  if (status && !isApplicationStatus(status)) return status;
  return BY_KEY[key].label;
}

export function applicationStatusBadgeClass(status: string | undefined): string {
  return BY_KEY[normalizeApplicationStatus(status)].badgeClass;
}

export const APPLICATION_STATUS_OPTIONS = PIPELINE_COLUMNS.map(({ key, label }) => ({
  value: key,
  label,
}));

/** Candidatures encore dans le flux « relancer si silence ». */
export function isRelanceEligibleStatus(status: Application['status'] | string): boolean {
  return status === 'pending' || status === 'followed_up';
}
