/**
 * Vacances scolaires métropole, zones A, B et C.
 * Sources :
 * - Arrêté du 22 octobre 2025, année 2026-2027
 * - Arrêté du 21 juillet 2026, année 2027-2028
 * - Service-Public, fiche F31952, vérifiée le 2 septembre 2026
 *
 * Le départ a lieu après la classe du jour indiqué, la reprise le matin du jour indiqué.
 * Les dates ci-dessous sont le premier et le dernier jour où l'établissement est fermé.
 * Un début officiel un samedi compte dès ce samedi. Un début un jour de classe
 * (été 2028, mardi 4 juillet) compte à partir du lendemain, car les cours ont encore lieu ce jour-là.
 */

export type SchoolZone = 'A' | 'B' | 'C';

export interface SchoolBreak {
  label: string;
  start: string;
  end: string;
  zones: SchoolZone[];
}

export const ZONE_ACADEMIES: Record<SchoolZone, string> = {
  A: 'Besançon, Bordeaux, Clermont-Ferrand, Dijon, Grenoble, Limoges, Lyon, Poitiers',
  B: 'Aix-Marseille, Amiens, Lille, Nancy-Metz, Nantes, Nice, Normandie, Orléans-Tours, Reims, Rennes, Strasbourg',
  C: 'Créteil, Montpellier, Paris, Toulouse, Versailles',
};

const ALL: SchoolZone[] = ['A', 'B', 'C'];

export const SCHOOL_BREAKS: SchoolBreak[] = [
  { label: 'Vacances de la Toussaint', start: '2026-10-17', end: '2026-11-01', zones: ALL },
  { label: 'Vacances de Noël', start: '2026-12-19', end: '2027-01-03', zones: ALL },
  { label: "Vacances d'hiver", start: '2027-02-13', end: '2027-02-28', zones: ['A'] },
  { label: "Vacances d'hiver", start: '2027-02-20', end: '2027-03-07', zones: ['B'] },
  { label: "Vacances d'hiver", start: '2027-02-06', end: '2027-02-21', zones: ['C'] },
  { label: 'Vacances de printemps', start: '2027-04-10', end: '2027-04-25', zones: ['A'] },
  { label: 'Vacances de printemps', start: '2027-04-17', end: '2027-05-02', zones: ['B'] },
  { label: 'Vacances de printemps', start: '2027-04-03', end: '2027-04-18', zones: ['C'] },
  { label: "Vacances d'été", start: '2027-07-03', end: '2027-09-01', zones: ALL },

  { label: 'Vacances de la Toussaint', start: '2027-10-23', end: '2027-11-07', zones: ALL },
  { label: 'Vacances de Noël', start: '2027-12-18', end: '2028-01-02', zones: ALL },
  { label: "Vacances d'hiver", start: '2028-02-19', end: '2028-03-05', zones: ['A'] },
  { label: "Vacances d'hiver", start: '2028-02-05', end: '2028-02-20', zones: ['B'] },
  { label: "Vacances d'hiver", start: '2028-02-12', end: '2028-02-27', zones: ['C'] },
  { label: 'Vacances de printemps', start: '2028-04-22', end: '2028-05-08', zones: ['A'] },
  { label: 'Vacances de printemps', start: '2028-04-08', end: '2028-04-23', zones: ['B'] },
  { label: 'Vacances de printemps', start: '2028-04-15', end: '2028-05-01', zones: ['C'] },
];

/** Jours où les classes vaquent, en dehors des vacances. L'apprenti est en entreprise. */
export const SCHOOL_CLOSURE_DAYS: { date: string; label: string; zones: SchoolZone[] }[] = [
  { date: '2027-05-07', label: 'Pont du 7 mai 2027', zones: ALL },
  { date: '2028-05-26', label: 'Pont du 26 mai 2028', zones: ALL },
];

/** Dernier jour de cours connu : mardi 4 juillet 2028, les vacances d'été commencent après la classe. */
export const KNOWN_SCHOOL_START = '2026-09-01';
export const KNOWN_SCHOOL_END = '2028-07-04';
export const SUMMER_2028_START = '2028-07-05';
export const SUMMER_2028_END = '2028-08-31';

export type SchoolDayState =
  | { state: 'break'; label: string }
  | { state: 'closure'; label: string }
  | { state: 'open' }
  | { state: 'unknown' };

export function schoolDayInfo(iso: string, zone: SchoolZone): SchoolDayState {
  const closed = SCHOOL_BREAKS.find(
    (period) => period.zones.includes(zone) && iso >= period.start && iso <= period.end
  );
  if (closed) return { state: 'break', label: closed.label };

  const closure = SCHOOL_CLOSURE_DAYS.find(
    (day) => day.date === iso && day.zones.includes(zone)
  );
  if (closure) return { state: 'closure', label: closure.label };

  if (iso >= SUMMER_2028_START && iso <= SUMMER_2028_END) {
    return { state: 'break', label: "Vacances d'été" };
  }

  if (iso >= KNOWN_SCHOOL_START && iso <= KNOWN_SCHOOL_END) return { state: 'open' };
  return { state: 'unknown' };
}
