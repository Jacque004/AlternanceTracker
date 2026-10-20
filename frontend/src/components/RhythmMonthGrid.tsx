import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ClassifiedDay, DayKind, RhythmSummary } from '../utils/rhythmCalendar';
import { formatLongDate } from '../utils/rhythmCalendar';

const WEEKDAY_LABELS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
const WEEKDAY_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const KIND_CLASS: Record<DayKind, string> = {
  outside: 'bg-white text-gray-300',
  weekend: 'bg-gray-50 text-gray-400',
  holiday: 'bg-amber-100 text-amber-950',
  school: 'bg-indigo-100 text-indigo-950',
  company: 'bg-emerald-100 text-emerald-950',
  'company-school-break': 'bg-emerald-300 text-emerald-950',
  'school-unconfirmed': 'bg-indigo-50 text-indigo-900',
};

export function RhythmLegend() {
  const items = [
    { className: 'bg-indigo-100', label: 'École' },
    { className: 'bg-emerald-100', label: 'Entreprise' },
    { className: 'bg-emerald-300', label: 'Entreprise, école fermée' },
    { className: 'bg-amber-100', label: 'Jour férié' },
  ];

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-700">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-sm ${item.className} border border-black/5`} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function RhythmStats({ summary }: { summary: RhythmSummary }) {
  const presence = summary.company + summary.companyDuringBreak;
  const cards = [
    { label: 'Jours en entreprise', value: presence, hint: `dont ${summary.companyDuringBreak} école fermée` },
    { label: "Jours à l'école", value: summary.school, hint: summary.unconfirmed > 0 ? `${summary.unconfirmed} indicatifs` : 'calendrier officiel' },
    { label: 'Jours fériés chômés', value: summary.holiday, hint: 'métropole' },
  ];

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</dt>
          <dd className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">{card.value}</dd>
          <p className="text-xs text-gray-500 mt-0.5">{card.hint}</p>
        </div>
      ))}
    </dl>
  );
}

interface RhythmMonthGridProps {
  month: Date;
  byDate: Map<string, ClassifiedDay>;
  selected?: string;
  onSelect?: (iso: string) => void;
  showTitle?: boolean;
}

export function RhythmMonthGrid({ month, byDate, selected, onSelect, showTitle = true }: RhythmMonthGridProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  return (
    <div className="break-inside-avoid">
      {showTitle ? (
        <h3 className="text-sm font-semibold text-gray-900 capitalize mb-2">
          {format(month, 'MMMM yyyy', { locale: fr })}
        </h3>
      ) : null}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
        {WEEKDAY_LABELS.map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="bg-gray-50 text-center text-[10px] sm:text-[11px] font-semibold text-gray-500 py-1 uppercase"
          >
            <span className="sm:hidden">{WEEKDAY_SHORT[index]}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
        {days.map((day) => {
          const iso = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, month);
          const info = byDate.get(iso);
          const kind = info?.kind ?? 'outside';
          const isSelected = iso === selected;
          const label = info
            ? `${formatLongDate(iso)}, ${info.label}`
            : formatLongDate(iso);

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect?.(iso)}
              aria-label={label}
              aria-pressed={isSelected}
              className={[
                'min-h-[44px] sm:min-h-[3.25rem] flex flex-col items-center justify-center gap-0.5 px-0.5 text-xs',
                inMonth ? KIND_CLASS[kind] : 'bg-gray-50 text-gray-300',
                isSelected ? 'ring-2 ring-inset ring-sky-600 z-[1]' : '',
                isToday(day) ? 'font-semibold' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>{format(day, 'd')}</span>
              {inMonth && info?.short ? (
                <span className="text-[9px] sm:text-[10px] leading-none font-medium">{info.short}</span>
              ) : (
                <span className="text-[9px] leading-none opacity-0" aria-hidden>
                  .
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
