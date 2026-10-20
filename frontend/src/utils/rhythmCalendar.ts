import { addDays, addMonths, format, startOfMonth, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  type SchoolZone,
  schoolDayInfo,
} from '../data/schoolHolidays';
import { frenchHolidayName } from './frenchHolidays';
import { formatDateOnly, isValidIsoDate, isoWeekday, parseDateOnly } from './rhythmCalendarDates';

export type RhythmMode = 'days' | 'weeks';
export type RhythmBlock = 'school' | 'company';

export interface RhythmConfig {
  zone: SchoolZone;
  mode: RhythmMode;
  /** Jours d'école, 1 = lundi … 5 = vendredi. */
  schoolWeekdays: number[];
  schoolWeeks: number;
  companyWeeks: number;
  firstBlock: RhythmBlock;
  durationMonths: 12 | 24;
  startDate: string;
  displayName: string;
  schoolName: string;
}

export type DayKind =
  | 'outside'
  | 'weekend'
  | 'holiday'
  | 'school'
  | 'company'
  | 'company-school-break'
  | 'school-unconfirmed';

export interface ClassifiedDay {
  date: string;
  kind: DayKind;
  /** Texte lu par le recruteur et les lecteurs d'écran. */
  label: string;
  /** Court libellé dans la case. Vide le week-end. */
  short: string;
}

export interface RhythmSummary {
  school: number;
  company: number;
  companyDuringBreak: number;
  holiday: number;
  unconfirmed: number;
}

const STORAGE_KEY = 'alternancetracker.rhythmCalendar.v1';
const SHARE_IDENTITY_KEY = 'alternancetracker.rhythmCalendar.shareIdentity.v1';

const WEEKDAY_NAMES = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];

export const DAY_PRESETS: { id: string; label: string; schoolWeekdays: number[] }[] = [
  { id: '2-3', label: '2 j école / 3 j entreprise', schoolWeekdays: [1, 2] },
  { id: '1-4', label: '1 j école / 4 j entreprise', schoolWeekdays: [1] },
  { id: '3-2', label: '3 j école / 2 j entreprise', schoolWeekdays: [1, 2, 3] },
];

export const WEEK_PRESETS: { id: string; label: string; schoolWeeks: number; companyWeeks: number }[] = [
  { id: '1-1', label: '1 sem. / 1 sem.', schoolWeeks: 1, companyWeeks: 1 },
  { id: '1-2', label: '1 sem. école / 2 sem. entreprise', schoolWeeks: 1, companyWeeks: 2 },
  { id: '1-3', label: '1 sem. école / 3 sem. entreprise', schoolWeeks: 1, companyWeeks: 3 },
];

export function defaultRhythmConfig(today = new Date()): RhythmConfig {
  const todayIso = formatDateOnly(today);
  let startDate = '2026-11-02';
  if (todayIso > startDate) {
    const next = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const day = next.getDay();
    if (day === 0) next.setDate(next.getDate() + 1);
    if (day === 6) next.setDate(next.getDate() + 2);
    startDate = formatDateOnly(next);
  }

  return {
    zone: 'A',
    mode: 'days',
    schoolWeekdays: [1, 2],
    schoolWeeks: 1,
    companyWeeks: 1,
    firstBlock: 'school',
    durationMonths: 12,
    startDate,
    displayName: '',
    schoolName: '',
  };
}

export function toggleSchoolWeekday(current: number[], day: number): number[] {
  if (day < 1 || day > 5) return current;
  const has = current.includes(day);
  if (has && current.length <= 1) return current;
  if (!has && current.length >= 4) return current;
  const next = has ? current.filter((value) => value !== day) : [...current, day];
  return next.sort((a, b) => a - b);
}

function cleanText(value: string, max: number): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}

function joinFr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} et ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

export function weekdayNames(days: number[]): string {
  return joinFr([...days].sort((a, b) => a - b).map((day) => WEEKDAY_NAMES[day] ?? '').filter(Boolean));
}

export function companyWeekdays(schoolWeekdays: number[]): number[] {
  return [1, 2, 3, 4, 5].filter((day) => !schoolWeekdays.includes(day));
}

export function rhythmSentence(config: RhythmConfig): string {
  if (config.mode === 'days') {
    const school = config.schoolWeekdays.length;
    const company = 5 - school;
    const schoolLabel = school > 1 ? 'jours' : 'jour';
    const companyLabel = company > 1 ? 'jours' : 'jour';
    return `${school} ${schoolLabel} à l'école (${weekdayNames(config.schoolWeekdays)}) et ${company} ${companyLabel} en entreprise (${weekdayNames(companyWeekdays(config.schoolWeekdays))})`;
  }

  const schoolLabel = config.schoolWeeks > 1 ? 'semaines' : 'semaine';
  const companyLabel = config.companyWeeks > 1 ? 'semaines' : 'semaine';
  const first = config.firstBlock === 'school' ? "l'école" : "l'entreprise";
  return `${config.schoolWeeks} ${schoolLabel} à l'école, puis ${config.companyWeeks} ${companyLabel} en entreprise. La première semaine du contrat est à ${first}`;
}

export function formatLongDate(iso: string): string {
  return format(parseDateOnly(iso), 'd MMMM yyyy', { locale: fr });
}

export function contractRange(config: RhythmConfig): { start: string; end: string } {
  const start = parseDateOnly(config.startDate);
  const end = addDays(addMonths(start, config.durationMonths), -1);
  return { start: formatDateOnly(start), end: formatDateOnly(end) };
}

export function contractMonths(config: RhythmConfig): Date[] {
  const { start, end } = contractRange(config);
  const months: Date[] = [];
  let cursor = startOfMonth(parseDateOnly(start));
  const last = startOfMonth(parseDateOnly(end));
  while (cursor.getTime() <= last.getTime()) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

function weekIndex(date: Date, start: Date): number {
  const startMonday = startOfWeek(start, { weekStartsOn: 1 });
  const dateMonday = startOfWeek(date, { weekStartsOn: 1 });
  const days = Math.round((dateMonday.getTime() - startMonday.getTime()) / 86_400_000);
  return Math.round(days / 7);
}

function plannedSlot(date: Date, config: RhythmConfig, start: Date): RhythmBlock {
  if (config.mode === 'days') {
    return config.schoolWeekdays.includes(isoWeekday(date)) ? 'school' : 'company';
  }
  const cycle = config.schoolWeeks + config.companyWeeks;
  const pos = ((weekIndex(date, start) % cycle) + cycle) % cycle;
  if (config.firstBlock === 'school') {
    return pos < config.schoolWeeks ? 'school' : 'company';
  }
  return pos < config.companyWeeks ? 'company' : 'school';
}

export function classifyRhythmDay(iso: string, config: RhythmConfig): ClassifiedDay {
  const { start, end } = contractRange(config);
  if (iso < start || iso > end) {
    return { date: iso, kind: 'outside', label: 'Hors contrat', short: '' };
  }

  const date = parseDateOnly(iso);
  const weekday = isoWeekday(date);
  if (weekday >= 6) {
    return { date: iso, kind: 'weekend', label: 'Week-end', short: '' };
  }

  const holiday = frenchHolidayName(iso);
  if (holiday) {
    return { date: iso, kind: 'holiday', label: holiday, short: 'Fér' };
  }

  const slot = plannedSlot(date, config, parseDateOnly(config.startDate));
  if (slot === 'company') {
    return { date: iso, kind: 'company', label: 'Entreprise', short: 'Ent' };
  }

  const school = schoolDayInfo(iso, config.zone);
  if (school.state === 'break' || school.state === 'closure') {
    return {
      date: iso,
      kind: 'company-school-break',
      label: `Entreprise, école fermée (${school.label.charAt(0).toLowerCase()}${school.label.slice(1)})`,
      short: 'Ent+',
    };
  }
  if (school.state === 'unknown') {
    return {
      date: iso,
      kind: 'school-unconfirmed',
      label: 'École (calendrier scolaire pas encore publié)',
      short: 'Éco?',
    };
  }
  return { date: iso, kind: 'school', label: 'École', short: 'Éco' };
}

export function buildRhythmDays(config: RhythmConfig): ClassifiedDay[] {
  const { start, end } = contractRange(config);
  const days: ClassifiedDay[] = [];
  let cursor = parseDateOnly(start);
  const last = parseDateOnly(end);
  while (cursor.getTime() <= last.getTime()) {
    days.push(classifyRhythmDay(formatDateOnly(cursor), config));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function indexRhythmDays(days: ClassifiedDay[]): Map<string, ClassifiedDay> {
  return new Map(days.map((day) => [day.date, day]));
}

export function summarizeRhythm(days: ClassifiedDay[]): RhythmSummary {
  const summary: RhythmSummary = {
    school: 0,
    company: 0,
    companyDuringBreak: 0,
    holiday: 0,
    unconfirmed: 0,
  };
  for (const day of days) {
    if (day.kind === 'school') summary.school += 1;
    else if (day.kind === 'company') summary.company += 1;
    else if (day.kind === 'company-school-break') summary.companyDuringBreak += 1;
    else if (day.kind === 'holiday') summary.holiday += 1;
    else if (day.kind === 'school-unconfirmed') summary.unconfirmed += 1;
  }
  return summary;
}

export function recruiterMessage(config: RhythmConfig, summary: RhythmSummary, link: string): string {
  const { start, end } = contractRange(config);
  const presence = summary.company + summary.companyDuringBreak;
  const lines = [
    'Bonjour,',
    '',
    `Mon rythme d'alternance : ${rhythmSentence(config)}, zone ${config.zone}.`,
    `Période : du ${formatLongDate(start)} au ${formatLongDate(end)} (${config.durationMonths} mois).`,
    `Présence en entreprise : ${presence} jours, dont ${summary.companyDuringBreak} pendant les vacances scolaires ou les jours où l'école est fermée.`,
    `Jours à l'école : ${summary.school}. Jours fériés chômés : ${summary.holiday}.`,
  ];
  if (summary.unconfirmed > 0) {
    lines.push(
      `${summary.unconfirmed} jours d'école restent indicatifs : le calendrier scolaire officiel ne couvre pas encore cette partie de la période.`
    );
  }
  lines.push('', `Le calendrier jour par jour : ${link}`);
  if (config.schoolName.trim()) {
    lines.push(`Établissement : ${config.schoolName.trim()}.`);
  }
  if (config.displayName.trim()) {
    lines.push('', 'Bien cordialement,', config.displayName.trim());
  }
  return lines.join('\n');
}

/** Lien public : le nom et l'école n'y figurent que si l'utilisateur le demande. */
export function rhythmConfigForShare(config: RhythmConfig, includeIdentity: boolean): RhythmConfig {
  if (includeIdentity) return config;
  return { ...config, displayName: '', schoolName: '' };
}

export function loadShareIdentity(): boolean {
  try {
    return localStorage.getItem(SHARE_IDENTITY_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveShareIdentity(include: boolean): void {
  try {
    localStorage.setItem(SHARE_IDENTITY_KEY, include ? '1' : '0');
  } catch {
    // navigation privée
  }
}

export function clearRhythmLocalData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SHARE_IDENTITY_KEY);
  } catch {
    // stockage indisponible
  }
}

export function configToSearch(config: RhythmConfig): string {
  const params = new URLSearchParams();
  params.set('z', config.zone);
  params.set('mode', config.mode === 'days' ? 'd' : 'w');
  params.set('wd', [...config.schoolWeekdays].sort((a, b) => a - b).join(''));
  params.set('sw', String(config.schoolWeeks));
  params.set('cw', String(config.companyWeeks));
  params.set('fb', config.firstBlock === 'school' ? 's' : 'c');
  params.set('du', String(config.durationMonths));
  params.set('sd', config.startDate);
  const name = cleanText(config.displayName, 80);
  const school = cleanText(config.schoolName, 120);
  if (name) params.set('n', name);
  if (school) params.set('e', school);
  return `?${params.toString()}`;
}

export function isShareableStartDate(iso: string): boolean {
  if (!isValidIsoDate(iso)) return false;
  const year = Number(iso.slice(0, 4));
  return year >= 2026 && year <= 2030;
}

export function configFromSearch(search: string): RhythmConfig | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const zone = params.get('z');
  if (zone !== 'A' && zone !== 'B' && zone !== 'C') return null;

  const modeRaw = params.get('mode');
  if (modeRaw !== 'd' && modeRaw !== 'w') return null;

  const wdRaw = params.get('wd') ?? '';
  if (!/^[1-5]{1,4}$/.test(wdRaw)) return null;
  const schoolWeekdays = [...new Set(wdRaw.split('').map(Number))].sort((a, b) => a - b);
  if (schoolWeekdays.length < 1 || schoolWeekdays.length > 4) return null;

  const schoolWeeks = Number(params.get('sw'));
  const companyWeeks = Number(params.get('cw'));
  if (
    !Number.isInteger(schoolWeeks) ||
    !Number.isInteger(companyWeeks) ||
    schoolWeeks < 1 ||
    schoolWeeks > 3 ||
    companyWeeks < 1 ||
    companyWeeks > 3
  ) {
    return null;
  }

  const first = params.get('fb');
  if (first !== 's' && first !== 'c') return null;

  const duration = Number(params.get('du'));
  if (duration !== 12 && duration !== 24) return null;

  const startDate = params.get('sd') ?? '';
  if (!isShareableStartDate(startDate)) return null;

  return {
    zone,
    mode: modeRaw === 'd' ? 'days' : 'weeks',
    schoolWeekdays,
    schoolWeeks,
    companyWeeks,
    firstBlock: first === 's' ? 'school' : 'company',
    durationMonths: duration,
    startDate,
    displayName: cleanText(params.get('n') ?? '', 80),
    schoolName: cleanText(params.get('e') ?? '', 120),
  };
}

export function loadRhythmConfig(): RhythmConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return configFromSearch(raw);
  } catch {
    return null;
  }
}

export function saveRhythmConfig(config: RhythmConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, configToSearch(config));
  } catch {
    // navigation privée : le calendrier reste utilisable le temps de la visite
  }
}

export function shareLocation(config: RhythmConfig): string {
  return `/rythme/partage${configToSearch(config)}`;
}

export function absoluteShareUrl(config: RhythmConfig, origin = window.location.origin): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${origin}${base}${shareLocation(config)}`;
}
