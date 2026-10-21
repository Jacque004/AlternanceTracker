import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from '../components/toast';
import { RhythmLegend, RhythmMonthGrid, RhythmStats } from '../components/RhythmMonthGrid';
import { ZONE_ACADEMIES, type SchoolZone } from '../data/schoolHolidays';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { formatDateOnly } from '../utils/rhythmCalendarDates';
import {
  DAY_PRESETS,
  WEEK_PRESETS,
  type RhythmConfig,
  buildRhythmDays,
  companyWeekdays,
  contractMonths,
  contractRange,
  defaultRhythmConfig,
  formatLongDate,
  indexRhythmDays,
  isShareableStartDate,
  loadRhythmConfig,
  loadShareIdentity,
  recruiterMessage,
  rhythmConfigForShare,
  rhythmSentence,
  absoluteShareUrl,
  saveRhythmConfig,
  saveShareIdentity,
  summarizeRhythm,
  toggleSchoolWeekday,
  weekdayNames,
} from '../utils/rhythmCalendar';

const WEEKDAY_BUTTONS = [
  { day: 1, label: 'Lun' },
  { day: 2, label: 'Mar' },
  { day: 3, label: 'Mer' },
  { day: 4, label: 'Jeu' },
  { day: 5, label: 'Ven' },
];

function patch(current: RhythmConfig, partial: Partial<RhythmConfig>): RhythmConfig {
  return { ...current, ...partial };
}

export default function RhythmCalendarPage() {
  const { user } = useSupabaseAuth();
  const skipProfile = useRef(loadRhythmConfig() !== null);
  const touched = useRef(false);
  const [config, setConfig] = useState<RhythmConfig>(() => loadRhythmConfig() ?? defaultRhythmConfig());
  const [monthIndex, setMonthIndex] = useState(0);
  const [selected, setSelected] = useState(() => (loadRhythmConfig() ?? defaultRhythmConfig()).startDate);
  const [includeIdentity, setIncludeIdentity] = useState(loadShareIdentity);

  const days = useMemo(() => buildRhythmDays(config), [config]);
  const byDate = useMemo(() => indexRhythmDays(days), [days]);
  const summary = useMemo(() => summarizeRhythm(days), [days]);
  const months = useMemo(() => contractMonths(config), [config]);
  const range = useMemo(() => contractRange(config), [config]);
  const viewMonth = months[Math.min(monthIndex, Math.max(months.length - 1, 0))] ?? months[0];
  const selectedDay = byDate.get(selected);
  const sharedConfig = useMemo(
    () => rhythmConfigForShare(config, includeIdentity),
    [config, includeIdentity]
  );
  const shareUrl = absoluteShareUrl(sharedConfig);
  const message = recruiterMessage(sharedConfig, summary, shareUrl);

  useEffect(() => {
    saveRhythmConfig(config);
  }, [config]);

  useEffect(() => {
    if (skipProfile.current || touched.current || !user) return;
    skipProfile.current = true;
    const desired = user.desiredStartDate?.slice(0, 10);
    setConfig((current) =>
      patch(current, {
        displayName: [user.firstName, user.lastName].filter(Boolean).join(' '),
        schoolName: user.school?.trim() || '',
        startDate: desired && isShareableStartDate(desired) ? desired : current.startDate,
      })
    );
  }, [user]);

  useEffect(() => {
    setMonthIndex((index) => Math.min(index, Math.max(months.length - 1, 0)));
  }, [months.length]);

  const update = (partial: Partial<RhythmConfig>) => {
    touched.current = true;
    setConfig((current) => patch(current, partial));
  };

  const copy = async (text: string, success: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(success);
    } catch {
      toast.error('Sélectionnez le texte du champ pour le copier.');
    }
  };

  const selectDay = (iso: string) => {
    setSelected(iso);
    const key = iso.slice(0, 7);
    const index = months.findIndex((month) => formatDateOnly(month).slice(0, 7) === key);
    if (index >= 0) setMonthIndex(index);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Calendrier de rythme</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-prose">
          Choisissez votre zone de vacances et votre rythme. Le calendrier place les jours d&apos;école et les jours
          en entreprise sur toute la durée du contrat. Le recruteur ouvre le lien sans créer de compte.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-5 lg:gap-8 lg:items-start">
        <section className="bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5 space-y-5">
          <div>
            <label htmlFor="rhythm-zone" className="block text-sm font-medium text-gray-800">
              Zone de vacances
            </label>
            <select
              id="rhythm-zone"
              value={config.zone}
              onChange={(event) => update({ zone: event.target.value as SchoolZone })}
              className="input-base mt-1.5"
            >
              <option value="A">Zone A</option>
              <option value="B">Zone B</option>
              <option value="C">Zone C</option>
            </select>
            <p className="mt-1.5 text-xs text-gray-500">{ZONE_ACADEMIES[config.zone]}</p>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-gray-800">Type de rythme</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  ['days', 'Jours fixes'],
                  ['weeks', 'Semaines'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={config.mode === mode}
                  onClick={() => update({ mode })}
                  className={`min-h-[44px] rounded-lg border px-3 text-sm font-medium ${
                    config.mode === mode
                      ? 'border-primary-500 bg-primary-50 text-primary-900'
                      : 'border-gray-200 text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {config.mode === 'days'
                ? 'Les mêmes jours chaque semaine, par exemple lundi et mardi à l’école.'
                : 'Des blocs qui alternent, par exemple une semaine à l’école puis une en entreprise.'}
            </p>
          </fieldset>

          {config.mode === 'days' ? (
            <>
              <fieldset>
                <legend className="text-sm font-medium text-gray-800">Rythme habituel</legend>
                <div className="mt-2 flex flex-col gap-2">
                  {DAY_PRESETS.map((preset) => {
                    const active =
                      preset.schoolWeekdays.join() === [...config.schoolWeekdays].sort((a, b) => a - b).join();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => update({ mode: 'days', schoolWeekdays: preset.schoolWeekdays })}
                        className={`min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm ${
                          active
                            ? 'border-primary-500 bg-primary-50 text-primary-900'
                            : 'border-gray-200 text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium text-gray-800">Jours à l&apos;école</legend>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {WEEKDAY_BUTTONS.map((button) => {
                    const on = config.schoolWeekdays.includes(button.day);
                    return (
                      <button
                        key={button.day}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          update({ mode: 'days', schoolWeekdays: toggleSchoolWeekday(config.schoolWeekdays, button.day) })
                        }
                        className={`min-h-[44px] rounded-lg border text-sm font-medium ${
                          on
                            ? 'border-indigo-400 bg-indigo-100 text-indigo-950'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-950'
                        }`}
                      >
                        {button.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  École : {weekdayNames(config.schoolWeekdays)}. Entreprise :{' '}
                  {weekdayNames(companyWeekdays(config.schoolWeekdays))}. Au moins un jour de chaque.
                </p>
              </fieldset>
            </>
          ) : (
            <>
              <fieldset>
                <legend className="text-sm font-medium text-gray-800">Blocs</legend>
                <div className="mt-2 flex flex-col gap-2">
                  {WEEK_PRESETS.map((preset) => {
                    const active =
                      config.schoolWeeks === preset.schoolWeeks && config.companyWeeks === preset.companyWeeks;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          update({
                            mode: 'weeks',
                            schoolWeeks: preset.schoolWeeks,
                            companyWeeks: preset.companyWeeks,
                          })
                        }
                        className={`min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm ${
                          active
                            ? 'border-primary-500 bg-primary-50 text-primary-900'
                            : 'border-gray-200 text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium text-gray-800">La première semaine du contrat</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    [
                      ['school', "À l'école"],
                      ['company', 'En entreprise'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={config.firstBlock === value}
                      onClick={() => update({ firstBlock: value })}
                      className={`min-h-[44px] rounded-lg border px-3 text-sm ${
                        config.firstBlock === value
                          ? 'border-primary-500 bg-primary-50 text-primary-900'
                          : 'border-gray-200 text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="rhythm-start" className="block text-sm font-medium text-gray-800">
                Début du contrat
              </label>
              <input
                id="rhythm-start"
                type="date"
                min="2026-01-01"
                max="2030-12-31"
                value={config.startDate}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isShareableStartDate(value)) {
                    update({ startDate: value });
                    setSelected(value);
                    setMonthIndex(0);
                  }
                }}
                className="input-base mt-1.5"
              />
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-gray-800">Durée</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {([12, 24] as const).map((months) => (
                  <button
                    key={months}
                    type="button"
                    aria-pressed={config.durationMonths === months}
                    onClick={() => update({ durationMonths: months })}
                    className={`min-h-[44px] rounded-lg border text-sm ${
                      config.durationMonths === months
                        ? 'border-primary-500 bg-primary-50 text-primary-900'
                        : 'border-gray-200 text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {months} mois
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label htmlFor="rhythm-name" className="block text-sm font-medium text-gray-800">
                Nom sur le calendrier
              </label>
              <input
                id="rhythm-name"
                value={config.displayName}
                maxLength={80}
                onChange={(event) => update({ displayName: event.target.value })}
                className="input-base mt-1.5"
                placeholder="Prénom Nom"
              />
            </div>
            <div>
              <label htmlFor="rhythm-school" className="block text-sm font-medium text-gray-800">
                École
              </label>
              <input
                id="rhythm-school"
                value={config.schoolName}
                maxLength={120}
                onChange={(event) => update({ schoolName: event.target.value })}
                className="input-base mt-1.5"
                placeholder="Nom de l'établissement"
              />
            </div>
          </div>
        </section>

        <div className="space-y-4 min-w-0">
          <section className="bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Aperçu</h2>
              <p className="text-sm text-gray-600 mt-1">{rhythmSentence(config)}, zone {config.zone}.</p>
              <p className="text-sm text-gray-600">
                Du {formatLongDate(range.start)} au {formatLongDate(range.end)}.
              </p>
            </div>
            <RhythmStats summary={summary} />
            <RhythmLegend />
            <p className="text-xs text-gray-500">
              Ent+ : jour prévu à l&apos;école, basculé en entreprise parce que l&apos;établissement est fermé
              (vacances ou pont). Les jours fériés métropolitains sont chômés. L&apos;Alsace-Moselle a le Vendredi saint
              et le 26 décembre en plus. La Corse suit la zone A en 2026-2027 ; son calendrier 2027-2028 n&apos;est pas
              encore publié.
            </p>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Envoyer au recruteur</h2>
            <p className="text-sm text-gray-600">
              Le lien est public : toute personne qui l&apos;a peut l&apos;ouvrir. Il contient le rythme, la zone et
              les dates. Il ne contient pas votre e-mail. Le nom et l&apos;école n&apos;y sont ajoutés que si vous
              cochez la case ci-dessous. Rien de ce lien n&apos;est enregistré sur le serveur.
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeIdentity}
                onChange={(event) => {
                  const next = event.target.checked;
                  setIncludeIdentity(next);
                  saveShareIdentity(next);
                }}
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                Inclure mon nom et mon école dans le lien. Ils resteront lisibles par quiconque ouvre l&apos;adresse.
              </span>
            </label>
            <label htmlFor="rhythm-link" className="block text-sm font-medium text-gray-800">
              Lien
            </label>
            <input
              id="rhythm-link"
              readOnly
              value={shareUrl}
              onFocus={(event) => event.target.select()}
              className="input-base"
            />
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <button type="button" className="btn-primary min-h-[44px]" onClick={() => copy(shareUrl, 'Lien copié')}>
                Copier le lien
              </button>
              <button
                type="button"
                className="btn-secondary min-h-[44px]"
                onClick={() => copy(message, 'Message copié')}
              >
                Copier le message
              </button>
              <a href={shareUrl} target="_blank" rel="noreferrer" className="btn-secondary min-h-[44px]">
                Ouvrir la page recruteur
              </a>
            </div>
            <label htmlFor="rhythm-message" className="block text-sm font-medium text-gray-800">
              Message
            </label>
            <textarea
              id="rhythm-message"
              readOnly
              rows={8}
              value={message}
              onFocus={(event) => event.target.select()}
              className="input-base font-sans"
            />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 capitalize">
                {viewMonth ? format(viewMonth, 'MMMM yyyy', { locale: fr }) : ''}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="px-3 min-h-[44px] rounded-lg border border-gray-200 text-sm disabled:opacity-40"
                  onClick={() => setMonthIndex((index) => Math.max(0, index - 1))}
                  disabled={monthIndex <= 0}
                  aria-label="Mois précédent"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="px-3 min-h-[44px] rounded-lg border border-gray-200 text-sm disabled:opacity-40"
                  onClick={() => setMonthIndex((index) => Math.min(months.length - 1, index + 1))}
                  disabled={monthIndex >= months.length - 1}
                  aria-label="Mois suivant"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {months.map((month, index) => {
                const key = formatDateOnly(month).slice(0, 7);
                const count = days.filter(
                  (day) =>
                    day.date.startsWith(key) &&
                    (day.kind === 'company' || day.kind === 'company-school-break')
                ).length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMonthIndex(index)}
                    aria-pressed={index === monthIndex}
                    className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-left min-h-[44px] ${
                      index === monthIndex ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="block text-xs font-medium capitalize text-gray-900">
                      {format(month, 'MMM yy', { locale: fr })}
                    </span>
                    <span className="block text-[11px] text-gray-500">{count} j. ent.</span>
                  </button>
                );
              })}
            </div>

            {viewMonth ? (
              <RhythmMonthGrid
                month={viewMonth}
                byDate={byDate}
                selected={selected}
                onSelect={selectDay}
                showTitle={false}
              />
            ) : null}

            <p className="text-sm text-gray-700" aria-live="polite">
              {selectedDay
                ? `${formatLongDate(selected)} — ${selectedDay.label}`
                : `${formatLongDate(selected)} — hors de la période du contrat`}
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
