import { differenceInCalendarDays, format, isValid, parseISO, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

/** Date pour champs <input type="date"> (jour civil local). */
export function formatDateForInput(s: string | undefined): string {
  if (!s) return '';
  const d = parseISO(s);
  if (!isValid(d)) return '';
  return format(d, 'yyyy-MM-dd');
}

/** Heure pour <input type="time"> (fuseau local). */
export function formatTimeForInput(s: string | undefined): string {
  if (!s) return '';
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  const d = parseISO(s);
  if (!isValid(d)) return '';
  return format(d, 'HH:mm');
}

/** Affichage court type liste / tableau (jour civil local). */
export function formatDisplayDate(s: string | undefined): string {
  if (!s) return '–';
  const d = parseISO(s);
  if (!isValid(d)) return '–';
  return format(d, 'dd/MM/yyyy', { locale: fr });
}

/** Heure locale pour affichage (HH:mm). */
export function formatDisplayTime(s: string | undefined): string {
  if (!s) return '';
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  const d = parseISO(s);
  if (!isValid(d)) return '';
  return format(d, 'HH:mm');
}

/** Jour civil local au format yyyy-MM-dd (ex. noms de fichiers). */
export function formatLocalDateIso(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/** Date du jour formatée comme les autres affichages courts (PDF, en-têtes). */
export function formatTodayDisplay(): string {
  return format(new Date(), 'dd/MM/yyyy', { locale: fr });
}

/**
 * Nombre de jours calendaires entre la date donnée et aujourd’hui (positif si la date est dans le passé).
 * Même intention que l’ancien getDaysAgo basé sur minuit local.
 */
export function getCalendarDaysAgo(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const d = parseISO(dateStr);
  if (!isValid(d)) return 0;
  return differenceInCalendarDays(startOfDay(new Date()), startOfDay(d));
}
