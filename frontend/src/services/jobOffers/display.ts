import { getCalendarDaysAgo, formatDisplayDate } from '../../utils/dateDisplay';

export function formatPublishedAgo(iso: string | null | undefined): string {
  if (!iso) return 'Date non précisée';
  const days = getCalendarDaysAgo(iso);
  if (days <= 0) return 'Publiée aujourd’hui';
  if (days === 1) return 'Publiée il y a 1 jour';
  if (days < 30) return `Publiée il y a ${days} jours`;
  return `Publiée le ${formatDisplayDate(iso)}`;
}
