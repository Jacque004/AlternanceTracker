import { format, isValid, parseISO, startOfWeek, subWeeks } from 'date-fns';

/** Objectifs hebdo par défaut si l’utilisateur n’a pas défini de quota. */
export const DEFAULT_WEEKLY_APPLICATIONS = 3;
export const WEEKLY_RELANCES_TARGET = 2;
export const WEEKLY_LETTERS_TARGET = 1;

export function startOfWeekMonday(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/** Lundi de la semaine au format yyyy-MM-dd (filtre PostgREST). */
export function weekStartIso(date: Date = new Date()): string {
  return format(startOfWeekMonday(date), 'yyyy-MM-dd');
}

export function applicationsWeeklyTarget(goal: number | null | undefined): number {
  if (goal != null && goal > 0) return goal;
  return DEFAULT_WEEKLY_APPLICATIONS;
}

function weekKey(date: Date): string {
  return format(startOfWeekMonday(date), 'yyyy-MM-dd');
}

/**
 * Nombre de semaines consécutives où l’objectif de candidatures est atteint.
 * La semaine en cours ne casse pas la série tant qu’elle n’est pas terminée.
 */
export function computeApplicationStreak(
  createdAtList: Array<string | undefined>,
  goal: number,
  now: Date = new Date()
): number {
  if (goal <= 0) return 0;

  const counts = new Map<string, number>();
  for (const iso of createdAtList) {
    if (!iso) continue;
    const parsed = parseISO(iso);
    if (!isValid(parsed)) continue;
    const key = weekKey(parsed);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let cursor = startOfWeekMonday(now);
  const currentCount = counts.get(weekKey(cursor)) ?? 0;
  if (currentCount < goal) {
    cursor = subWeeks(cursor, 1);
  }

  let streak = 0;
  for (let i = 0; i < 104; i += 1) {
    if ((counts.get(weekKey(cursor)) ?? 0) >= goal) {
      streak += 1;
      cursor = subWeeks(cursor, 1);
    } else {
      break;
    }
  }
  return streak;
}

export function isInCurrentWeek(iso: string | undefined, now: Date = new Date()): boolean {
  if (!iso) return false;
  return iso >= weekStartIso(now);
}

export function streakLabel(streak: number): string {
  if (streak <= 0) return 'Pas encore de série : tenez l’objectif une semaine complète.';
  if (streak === 1) return '1 semaine tenue.';
  return `${streak} semaines d’affilée.`;
}
