import { addDays } from 'date-fns';
import { formatDateOnly } from './rhythmCalendarDates';

/** Dimanche de Pâques, calendrier grégorien. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const cache = new Map<number, Map<string, string>>();

function holidaysForYear(year: number): Map<string, string> {
  const cached = cache.get(year);
  if (cached) return cached;

  const easter = easterSunday(year);
  const map = new Map<string, string>();
  const add = (date: Date, label: string) => map.set(formatDateOnly(date), label);

  add(new Date(year, 0, 1), "Jour de l'an");
  add(addDays(easter, 1), 'Lundi de Pâques');
  add(new Date(year, 4, 1), 'Fête du Travail');
  add(new Date(year, 4, 8), 'Victoire 1945');
  add(addDays(easter, 39), 'Ascension');
  add(addDays(easter, 50), 'Lundi de Pentecôte');
  add(new Date(year, 6, 14), 'Fête nationale');
  add(new Date(year, 7, 15), 'Assomption');
  add(new Date(year, 10, 1), 'Toussaint');
  add(new Date(year, 10, 11), 'Armistice');
  add(new Date(year, 11, 25), 'Noël');

  cache.set(year, map);
  return map;
}

/** Jour férié métropolitain. L'Alsace-Moselle a deux jours de plus, non inclus ici. */
export function frenchHolidayName(iso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const year = Number(iso.slice(0, 4));
  return holidaysForYear(year).get(iso) ?? null;
}
