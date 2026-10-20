import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import { RhythmLegend, RhythmMonthGrid, RhythmStats } from '../components/RhythmMonthGrid';
import { ZONE_ACADEMIES } from '../data/schoolHolidays';
import { formatDateOnly } from '../utils/rhythmCalendarDates';
import {
  buildRhythmDays,
  configFromSearch,
  contractMonths,
  contractRange,
  formatLongDate,
  indexRhythmDays,
  rhythmSentence,
  summarizeRhythm,
} from '../utils/rhythmCalendar';

export default function RhythmSharePage() {
  const [params] = useSearchParams();
  const config = useMemo(() => configFromSearch(`?${params.toString()}`), [params]);
  const days = useMemo(() => (config ? buildRhythmDays(config) : []), [config]);
  const byDate = useMemo(() => indexRhythmDays(days), [days]);
  const summary = useMemo(() => summarizeRhythm(days), [days]);
  const months = useMemo(() => (config ? contractMonths(config) : []), [config]);
  const [selected, setSelected] = useState(config?.startDate ?? '');
  const selectedDay = byDate.get(selected);

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <Link to="/" aria-label="AlternanceTracker, accueil">
              <Logo className="h-10 w-auto" />
            </Link>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold text-gray-900">Calendrier introuvable</h1>
          <p className="mt-2 text-sm text-gray-600">
            Ce lien ne contient pas un rythme valide. Le calendrier se construit depuis un compte AlternanceTracker.
          </p>
          <Link to="/register" className="btn-primary mt-6 min-h-[44px]">
            Créer un compte
          </Link>
        </main>
      </div>
    );
  }

  const range = contractRange(config);

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <header className="bg-white border-b border-gray-200 print:border-0">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link to="/" aria-label="AlternanceTracker, accueil" className="print:pointer-events-none">
            <Logo className="h-10 w-auto" />
          </Link>
          <button type="button" className="btn-secondary min-h-[44px] print:hidden" onClick={() => window.print()}>
            Imprimer
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Calendrier d&apos;alternance
          </h1>
          {config.displayName ? (
            <p className="mt-1 text-base text-gray-900">{config.displayName}</p>
          ) : null}
          {config.schoolName ? <p className="text-sm text-gray-600">{config.schoolName}</p> : null}
        </div>

        <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3 print:border-0 print:p-0">
          <p className="text-sm sm:text-base text-gray-800">
            {rhythmSentence(config)}, zone {config.zone}.
          </p>
          <p className="text-sm text-gray-600">
            Du {formatLongDate(range.start)} au {formatLongDate(range.end)}. Académies : {ZONE_ACADEMIES[config.zone]}.
          </p>
          <p className="text-sm text-gray-800">
            Les cases vertes sont des jours en entreprise. <strong>Ent+</strong> veut dire que l&apos;école est fermée
            (vacances ou pont) et que je suis en entreprise. Les cases ambre sont des jours fériés chômés.
          </p>
          <RhythmStats summary={summary} />
          <RhythmLegend />
        </section>

        <p className="text-sm text-gray-700" aria-live="polite">
          {selectedDay
            ? `${formatLongDate(selected)} — ${selectedDay.label}`
            : 'Sélectionnez un jour pour le détail.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {months.map((month) => (
            <section key={formatDateOnly(month)} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 print:border-gray-300">
              <RhythmMonthGrid month={month} byDate={byDate} selected={selected} onSelect={setSelected} />
            </section>
          ))}
        </div>

        <p className="text-xs text-gray-500 max-w-prose">
          Vacances scolaires officielles des zones A, B et C jusqu&apos;à l&apos;été 2028. Les jours fériés sont ceux de
          la métropole : l&apos;Alsace-Moselle ajoute le Vendredi saint et le 26 décembre. La Corse suit la zone A en
          2026-2027.
        </p>
        <p className="text-xs text-gray-500 max-w-prose">
          Cette page est publique. Elle affiche uniquement ce qui a été placé dans le lien.
          {' '}
          <Link to="/politique-confidentialite" className="text-primary-600 hover:underline">
            Politique de confidentialité
          </Link>
        </p>
      </main>
    </div>
  );
}
