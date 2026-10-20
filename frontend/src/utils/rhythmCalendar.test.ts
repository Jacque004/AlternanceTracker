import { describe, expect, it } from 'vitest';
import { easterSunday, frenchHolidayName } from './frenchHolidays';
import { formatDateOnly } from './rhythmCalendarDates';
import {
  type RhythmConfig,
  buildRhythmDays,
  classifyRhythmDay,
  configFromSearch,
  configToSearch,
  contractRange,
  defaultRhythmConfig,
  recruiterMessage,
  rhythmConfigForShare,
  summarizeRhythm,
  toggleSchoolWeekday,
} from './rhythmCalendar';

function config(partial: Partial<RhythmConfig> = {}): RhythmConfig {
  return {
    zone: 'A',
    mode: 'days',
    schoolWeekdays: [1, 2],
    schoolWeeks: 1,
    companyWeeks: 1,
    firstBlock: 'school',
    durationMonths: 12,
    startDate: '2026-09-01',
    displayName: '',
    schoolName: '',
    ...partial,
  };
}

describe('calendrier de rythme', () => {
  it('calcule les fêtes mobiles', () => {
    expect(formatDateOnly(easterSunday(2026))).toBe('2026-04-05');
    expect(formatDateOnly(easterSunday(2027))).toBe('2027-03-28');
    expect(formatDateOnly(easterSunday(2028))).toBe('2028-04-16');
    expect(frenchHolidayName('2027-03-29')).toBe('Lundi de Pâques');
    expect(frenchHolidayName('2027-05-06')).toBe('Ascension');
    expect(frenchHolidayName('2027-05-01')).toBe('Fête du Travail');
  });

  it('place la Toussaint 2026 en entreprise et la reprise à l école', () => {
    const rhythm = config();
    expect(classifyRhythmDay('2026-10-16', rhythm).kind).toBe('company');
    expect(classifyRhythmDay('2026-10-19', rhythm)).toMatchObject({
      kind: 'company-school-break',
      short: 'Ent+',
    });
    expect(classifyRhythmDay('2026-10-21', rhythm).kind).toBe('company');
    expect(classifyRhythmDay('2026-11-02', rhythm)).toMatchObject({ kind: 'school', short: 'Éco' });
    expect(classifyRhythmDay('2026-11-01', rhythm).kind).toBe('weekend');
  });

  it('distingue les zones pour les vacances d hiver 2027', () => {
    const monday = '2027-02-22';
    expect(classifyRhythmDay(monday, config({ zone: 'C' })).kind).toBe('school');
    expect(classifyRhythmDay(monday, config({ zone: 'A' })).kind).toBe('company-school-break');
    expect(classifyRhythmDay(monday, config({ zone: 'B' })).kind).toBe('company-school-break');
    expect(classifyRhythmDay('2027-03-01', config({ zone: 'A' })).kind).toBe('school');
    expect(classifyRhythmDay('2027-03-01', config({ zone: 'B' })).kind).toBe('company-school-break');
  });

  it('bascule un jour d école en entreprise lors du pont du 7 mai 2027', () => {
    const fridaySchool = config({ schoolWeekdays: [5] });
    expect(classifyRhythmDay('2027-05-06', fridaySchool).kind).toBe('holiday');
    expect(classifyRhythmDay('2027-05-07', fridaySchool)).toMatchObject({
      kind: 'company-school-break',
      label: expect.stringMatching(/pont du 7 mai 2027/i),
    });
    expect(classifyRhythmDay('2027-05-07', config()).kind).toBe('company');
  });

  it('alterne les semaines et couvre les vacances de Noël en entreprise', () => {
    const rhythm = config({
      mode: 'weeks',
      startDate: '2026-11-02',
      schoolWeeks: 1,
      companyWeeks: 1,
      firstBlock: 'school',
    });
    expect(classifyRhythmDay('2026-11-02', rhythm).kind).toBe('school');
    expect(classifyRhythmDay('2026-11-06', rhythm).kind).toBe('school');
    expect(classifyRhythmDay('2026-11-09', rhythm).kind).toBe('company');
    expect(classifyRhythmDay('2026-11-16', rhythm).kind).toBe('school');
    expect(classifyRhythmDay('2026-12-28', rhythm).kind).toBe('company-school-break');
  });

  it('compte un contrat de 12 mois à partir du 1er septembre 2026', () => {
    const rhythm = config();
    expect(contractRange(rhythm)).toEqual({ start: '2026-09-01', end: '2027-08-31' });
    const summary = summarizeRhythm(buildRhythmDays(rhythm));
    expect(summary).toEqual({
      school: 69,
      company: 151,
      companyDuringBreak: 34,
      holiday: 7,
      unconfirmed: 0,
    });
  });

  it('signale les jours au-delà du calendrier publié', () => {
    const rhythm = config({ startDate: '2028-09-03', durationMonths: 12 });
    expect(classifyRhythmDay('2028-09-04', rhythm).kind).toBe('school-unconfirmed');
    expect(classifyRhythmDay('2028-08-15', config({ startDate: '2028-07-01' })).kind).toBe('holiday');
    expect(classifyRhythmDay('2028-07-04', config({ startDate: '2028-07-01' })).kind).toBe('school');
    expect(classifyRhythmDay('2028-07-05', config({ startDate: '2028-07-01' })).kind).toBe('company');
    expect(classifyRhythmDay('2028-07-10', config({ startDate: '2028-07-01' })).kind).toBe('company-school-break');
  });

  it('retire le nom et l école du lien public par défaut', () => {
    const rhythm = config({ displayName: 'Camille Martin', schoolName: 'CFA Paris' });
    const hidden = configToSearch(rhythmConfigForShare(rhythm, false));
    const shown = configToSearch(rhythmConfigForShare(rhythm, true));
    expect(hidden).not.toMatch(/(^|[?&])n=/);
    expect(hidden).not.toMatch(/(^|[?&])e=/);
    expect(shown).toMatch(/(^|[?&])n=/);
    expect(shown).toContain('CFA');
  });

  it('fige le lien et le relit, y compris les accents', () => {
    const rhythm = config({
      displayName: 'Chloé Martin',
      schoolName: 'École & CFA',
      zone: 'B',
      durationMonths: 24,
    });
    const parsed = configFromSearch(configToSearch(rhythm));
    expect(parsed).toMatchObject({
      displayName: 'Chloé Martin',
      schoolName: 'École & CFA',
      zone: 'B',
      durationMonths: 24,
      schoolWeekdays: [1, 2],
    });
    expect(configFromSearch('?z=D&mode=d&wd=12&sw=1&cw=1&fb=s&du=12&sd=2026-09-01')).toBeNull();
    expect(configFromSearch('?z=A&mode=d&wd=12&sw=1&cw=1&fb=s&du=13&sd=2026-09-01')).toBeNull();
    expect(configFromSearch('?z=A&mode=d&wd=6&sw=1&cw=1&fb=s&du=12&sd=2026-09-01')).toBeNull();
    expect(configFromSearch('?z=A&mode=d&wd=12&sw=1&cw=1&fb=s&du=12&sd=2025-09-01')).toBeNull();
  });

  it('garde au moins un jour d école et un jour en entreprise', () => {
    expect(toggleSchoolWeekday([1], 1)).toEqual([1]);
    expect(toggleSchoolWeekday([1, 2, 3, 4], 5)).toEqual([1, 2, 3, 4]);
    expect(toggleSchoolWeekday([1, 2], 1)).toEqual([2]);
  });

  it('propose le 2 novembre 2026 comme début par défaut avant cette date', () => {
    expect(defaultRhythmConfig(new Date(2026, 9, 19)).startDate).toBe('2026-11-02');
  });

  it('rédige un message avec la présence en entreprise', () => {
    const rhythm = config({ displayName: 'Camille Martin' });
    const text = recruiterMessage(rhythm, summarizeRhythm(buildRhythmDays(rhythm)), 'https://exemple.test/rythme');
    expect(text).toContain('zone A');
    expect(text).toContain('lundi et mardi');
    expect(text).toContain('https://exemple.test/rythme');
    expect(text).toContain('Camille Martin');
    expect(text).toContain('1 septembre 2026');
  });
});
