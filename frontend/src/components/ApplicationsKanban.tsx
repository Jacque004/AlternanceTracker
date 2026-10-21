import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { Application } from '../types';
import {
  PIPELINE_COLUMNS,
  applicationNeedsFollowUp,
  applicationStatusLabel,
  type ApplicationStatus,
} from '../utils/applicationStatus';
import { formatDisplayDate, formatDisplayTime, getCalendarDaysAgo } from '../utils/dateDisplay';

interface ApplicationsKanbanProps {
  applications: Application[];
  onStatusChange: (id: number, status: ApplicationStatus) => Promise<void>;
  onMarkRelance?: (id: number) => Promise<void>;
  movingId: number | null;
}

const HEADER_BG: Record<ApplicationStatus, string> = {
  to_apply: 'bg-slate-100/90',
  pending: 'bg-amber-100/80',
  followed_up: 'bg-orange-100/80',
  interview: 'bg-blue-100/75',
  accepted: 'bg-emerald-100/80',
  rejected: 'bg-red-100/70',
};

const COLUMN_BG: Record<ApplicationStatus, string> = {
  to_apply: 'bg-slate-50/90',
  pending: 'bg-amber-50/40',
  followed_up: 'bg-orange-50/40',
  interview: 'bg-blue-50/35',
  accepted: 'bg-emerald-50/40',
  rejected: 'bg-red-50/30',
};

function useFinePointer() {
  const [canDrag, setCanDrag] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(pointer: fine)');
    const update = () => setCanDrag(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  return canDrag;
}

function relativeDay(iso: string | undefined): string | null {
  if (!iso) return null;
  const days = getCalendarDaysAgo(iso);
  if (days === 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  if (days > 1) return `il y a ${days} j`;
  if (days === -1) return 'demain';
  return `dans ${-days} j`;
}

function cardCue(app: Application): { text: string; chip?: string; tone: 'muted' | 'amber' | 'blue' } | null {
  if (app.status === 'interview' && app.interviewDate) {
    const days = getCalendarDaysAgo(app.interviewDate);
    const text = [formatDisplayDate(app.interviewDate), formatDisplayTime(app.interviewTime), app.interviewPlace?.trim()]
      .filter(Boolean)
      .join(' · ');
    if (days > 0) return { text, chip: 'Passé', tone: 'amber' };
    if (days === 0) return { text, chip: 'Aujourd’hui', tone: 'blue' };
    if (days === -1) return { text, chip: 'Demain', tone: 'blue' };
    if (days < 0 && days >= -7) return { text, chip: `Dans ${-days} j`, tone: 'blue' };
    return { text, tone: 'muted' };
  }

  if (app.status === 'pending' || app.status === 'followed_up') {
    const anchor =
      app.status === 'followed_up' && app.lastRelanceAt
        ? app.lastRelanceAt
        : app.applicationDate || app.createdAt;
    const rel = relativeDay(anchor);
    const needs = applicationNeedsFollowUp(app);
    const prefix = app.status === 'followed_up' && app.lastRelanceAt ? 'Relancée' : 'Envoyée';
    return {
      text: rel ? `${prefix} ${rel}` : 'Date non précisée',
      chip: needs ? 'À relancer' : undefined,
      tone: needs ? 'amber' : 'muted',
    };
  }

  if (app.status === 'to_apply') {
    const rel = relativeDay(app.createdAt);
    return { text: rel ? `Ajoutée ${rel}` : 'À envoyer', tone: 'muted' };
  }

  const rel = relativeDay(app.responseDate);
  if (!rel) return null;
  return { text: `Réponse ${rel}`, tone: 'muted' };
}

function menuPosition(anchor: DOMRect) {
  const margin = 8;
  const width = Math.min(260, window.innerWidth - margin * 2);
  let left = anchor.left;
  if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
  left = Math.max(margin, left);

  const spaceBelow = window.innerHeight - anchor.bottom - margin;
  const spaceAbove = anchor.top - margin;
  const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(120, Math.min(320, openUp ? spaceAbove : spaceBelow));
  const top = openUp ? Math.max(margin, anchor.top - maxHeight - 4) : anchor.bottom + 4;
  return { top, left, width, maxHeight };
}

function IconChevron({ direction }: { direction: 'left' | 'right' | 'down' }) {
  const rotate = direction === 'left' ? 'rotate-90' : direction === 'right' ? '-rotate-90' : '';
  return (
    <svg className={`h-4 w-4 ${rotate}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StatusMoveMenu({
  companyName,
  status,
  disabled,
  onSelect,
}: {
  companyName: string;
  status: ApplicationStatus;
  disabled: boolean;
  onSelect: (status: ApplicationStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<ReturnType<typeof menuPosition> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label = applicationStatusLabel(status);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    first?.focus({ preventScroll: true });

    let watchScroll = false;
    const enableScrollWatch = window.setTimeout(() => {
      watchScroll = true;
    }, 50);

    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    };
    const onScroll = (event: Event) => {
      if (!watchScroll) return;
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.clearTimeout(enableScrollWatch);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, close]);

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
    );
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown'
        ? items[(index + 1) % items.length]
        : items[(index - 1 + items.length) % items.length];
    next?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Déplacer ${companyName}, actuellement ${label}`}
        onClick={() => {
          if (!buttonRef.current) return;
          setBox(menuPosition(buttonRef.current.getBoundingClientRect()));
          setOpen((current) => !current);
        }}
        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 sm:min-h-9"
      >
        Déplacer
        <IconChevron direction="down" />
      </button>
      {open && box
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="listbox"
              aria-label={`Choisir l’étape pour ${companyName}`}
              onKeyDown={onMenuKeyDown}
              style={{
                position: 'fixed',
                top: box.top,
                left: box.left,
                width: box.width,
                maxHeight: box.maxHeight,
                zIndex: 60,
              }}
              className="overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
            >
              {PIPELINE_COLUMNS.map((col) => {
                const selected = col.key === status;
                return (
                  <button
                    key={col.key}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={selected}
                    onClick={() => {
                      close(true);
                      onSelect(col.key);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left min-h-[44px] ${
                      selected ? 'bg-gray-50 text-gray-400' : 'text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{col.label}</span>
                      <span className="block text-xs text-gray-500">{col.hint}</span>
                    </span>
                    {selected ? <span className="text-[11px] font-medium text-gray-400">Actuel</span> : null}
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function KanbanCard({
  app,
  badgeClass,
  canDrag,
  moving,
  dragging,
  onDragStart,
  onDragEnd,
  onStatusChange,
  onMarkRelance,
}: {
  app: Application;
  badgeClass: string;
  canDrag: boolean;
  moving: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onStatusChange: (status: ApplicationStatus) => void;
  onMarkRelance?: () => void;
}) {
  const cue = cardCue(app);
  const needsFollowUp = applicationNeedsFollowUp(app);
  const detail = [app.location?.trim(), app.salaryRange?.trim()].filter(Boolean).join(' · ');
  const initial = app.companyName.trim().charAt(0).toUpperCase() || '?';
  const accent = cue?.chip
    ? cue.tone === 'amber'
      ? 'border-l-amber-400'
      : 'border-l-blue-500'
    : 'border-l-transparent';
  const cueTextClass = cue?.tone === 'amber' ? 'text-amber-900' : cue?.tone === 'blue' ? 'text-blue-800' : 'text-gray-500';
  const chipClass =
    cue?.tone === 'amber' ? 'bg-amber-100 text-amber-950' : 'bg-blue-100 text-blue-800';

  return (
    <article
      draggable={canDrag && !moving}
      onDragStart={(event) => {
        const target = event.target;
        if (target instanceof Element && target.closest('button, [data-kanban-nodrag]')) {
          event.preventDefault();
          return;
        }
        event.dataTransfer?.setData('text/plain', String(app.id));
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`rounded-lg border border-gray-200 border-l-[3px] bg-white p-2.5 shadow-sm motion-safe:transition-shadow hover:shadow-md ${accent} ${
        canDrag && !moving ? 'cursor-grab active:cursor-grabbing' : ''
      } ${dragging || moving ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-2">
        {canDrag ? (
          <span className="mt-1.5 shrink-0 text-gray-300" aria-hidden>
            <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
              <circle cx="2" cy="2" r="1.15" />
              <circle cx="8" cy="2" r="1.15" />
              <circle cx="2" cy="8" r="1.15" />
              <circle cx="8" cy="8" r="1.15" />
              <circle cx="2" cy="14" r="1.15" />
              <circle cx="8" cy="14" r="1.15" />
            </svg>
          </span>
        ) : null}
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${badgeClass}`}
          aria-hidden
        >
          {initial}
        </span>
        <Link to={`/applications/${app.id}/edit`} className="min-w-0 flex-1 rounded-md">
          <p className="text-sm font-semibold leading-snug text-gray-900 line-clamp-2">{app.companyName}</p>
          <p className="mt-0.5 text-xs leading-snug text-gray-500 line-clamp-2">{app.position}</p>
        </Link>
      </div>
      {detail ? <p className="mt-1.5 truncate text-xs text-gray-500">{detail}</p> : null}
      {cue ? (
        <p className={`mt-1.5 flex flex-wrap items-center gap-1.5 text-xs ${cueTextClass}`}>
          <span>{cue.text}</span>
          {cue.chip ? (
            <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${chipClass}`}>{cue.chip}</span>
          ) : null}
        </p>
      ) : null}
      {moving ? <p className="mt-1.5 text-xs font-medium text-primary-700">Mise à jour…</p> : null}
      <div className="mt-2.5 flex items-center gap-1.5">
        <StatusMoveMenu
          companyName={app.companyName}
          status={app.status}
          disabled={moving}
          onSelect={onStatusChange}
        />
        <Link
          to={`/preparer/lettres?company=${encodeURIComponent(app.companyName)}&position=${encodeURIComponent(app.position)}`}
          aria-label={`Préparer une lettre pour ${app.companyName}`}
          data-kanban-nodrag=""
          className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 sm:min-h-9 sm:min-w-9"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
          </svg>
        </Link>
      </div>
      {needsFollowUp && onMarkRelance ? (
        <button
          type="button"
          disabled={moving}
          onClick={onMarkRelance}
          aria-label={`Relancer ${app.companyName}`}
          className="mt-1.5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-amber-300/80 bg-amber-100 px-2 text-xs font-semibold text-amber-950 hover:bg-amber-200 disabled:opacity-50 sm:min-h-9"
        >
          Relancer
        </button>
      ) : null}
    </article>
  );
}

export function ApplicationsKanban({
  applications,
  onStatusChange,
  onMarkRelance,
  movingId,
}: ApplicationsKanbanProps) {
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStatus | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const canDrag = useFinePointer();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragDepth = useRef<Partial<Record<ApplicationStatus, number>>>({});

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 8,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    });
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener('scroll', updateEdges, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateEdges) : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      observer?.disconnect();
    };
  }, [updateEdges, applications.length]);

  useEffect(() => {
    if (draggingId == null) return;
    const el = scrollerRef.current;
    if (!el) return;
    let velocity = 0;
    let frame = 0;
    const tick = () => {
      if (velocity === 0) {
        frame = 0;
        return;
      }
      el.scrollLeft += velocity;
      frame = requestAnimationFrame(tick);
    };
    const onMove = (event: DragEvent) => {
      const rect = el.getBoundingClientRect();
      const edge = 64;
      if (event.clientX < rect.left + edge) velocity = -16;
      else if (event.clientX > rect.right - edge) velocity = 16;
      else velocity = 0;
      if (velocity !== 0 && frame === 0) frame = requestAnimationFrame(tick);
    };
    window.addEventListener('dragover', onMove);
    return () => {
      window.removeEventListener('dragover', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [draggingId]);

  const endDrag = () => {
    dragDepth.current = {};
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const handleDrop = async (status: ApplicationStatus, event: React.DragEvent) => {
    event.preventDefault();
    dragDepth.current[status] = 0;
    setDragOverColumn(null);
    const raw = event.dataTransfer?.getData('text/plain') ?? '';
    const id = Number(raw);
    setDraggingId(null);
    if (!id) return;
    const app = applications.find((item) => item.id === id);
    if (!app || app.status === status) return;
    await onStatusChange(id, status);
  };

  const scrollBoard = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: direction * Math.max(260, el.clientWidth * 0.75),
      behavior: reduce ? 'auto' : 'smooth',
    });
  };

  const followUpTotal = applications.filter((app) => applicationNeedsFollowUp(app)).length;
  const countLabel = `${applications.length} candidature${applications.length > 1 ? 's' : ''}`;

  return (
    <div className="min-w-0">
      <p className="sr-only">
        Tableau Kanban des candidatures. Glissez une carte vers une autre colonne, ou utilisez Déplacer.
        Les candidatures sans nouvelle depuis plusieurs jours sont marquées à relancer.
      </p>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-0.5">
        <p className="text-xs text-gray-500">
          {countLabel}
          {followUpTotal > 0 ? (
            <span className="font-medium text-amber-800">
              {' '}
              · {followUpTotal} à relancer
            </span>
          ) : null}
        </p>
        <p className="text-xs text-gray-400 sm:hidden">Balayez pour voir les autres étapes.</p>
        <p className="hidden text-xs text-gray-400 sm:block">
          {canDrag ? 'Glissez une carte, ou ouvrez Déplacer.' : 'Ouvrez Déplacer pour changer d’étape.'}
        </p>
      </div>
      <div className="relative min-w-0">
        {edges.left ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-8 bg-gradient-to-r from-white to-transparent sm:block" />
            <button
              type="button"
              onClick={() => scrollBoard(-1)}
              aria-label="Colonnes précédentes"
              className={`absolute left-1 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 sm:inline-flex ${
                draggingId != null ? 'pointer-events-none' : ''
              }`}
            >
              <IconChevron direction="left" />
            </button>
          </>
        ) : null}
        {edges.right ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-8 bg-gradient-to-l from-white to-transparent sm:block" />
            <button
              type="button"
              onClick={() => scrollBoard(1)}
              aria-label="Colonnes suivantes"
              className={`absolute right-1 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 sm:inline-flex ${
                draggingId != null ? 'pointer-events-none' : ''
              }`}
            >
              <IconChevron direction="right" />
            </button>
          </>
        ) : null}
        <div
          ref={scrollerRef}
          className="overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory scroll-px-1 sm:snap-none"
        >
          <div className="flex items-start gap-3 min-w-max pr-1">
            {PIPELINE_COLUMNS.map((col) => {
              const cards = applications.filter((app) => app.status === col.key);
              const isOver = dragOverColumn === col.key;
              const followUps = cards.filter((app) => applicationNeedsFollowUp(app)).length;
              return (
                <section
                  key={col.key}
                  aria-label={`${col.label}, ${cards.length} candidature${cards.length > 1 ? 's' : ''}`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    dragDepth.current[col.key] = (dragDepth.current[col.key] ?? 0) + 1;
                    setDragOverColumn((current) => (current === col.key ? current : col.key));
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
                  }}
                  onDragLeave={() => {
                    dragDepth.current[col.key] = Math.max(0, (dragDepth.current[col.key] ?? 1) - 1);
                    if (dragDepth.current[col.key] === 0) {
                      setDragOverColumn((current) => (current === col.key ? null : current));
                    }
                  }}
                  onDrop={(event) => void handleDrop(col.key, event)}
                  style={{ borderTopColor: col.color }}
                  className={`flex w-[min(78vw,18rem)] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-gray-200/90 border-t-4 shadow-sm min-h-[16rem] sm:h-[min(32rem,70dvh)] ${COLUMN_BG[col.key]} ${
                    isOver ? 'ring-2 ring-inset ring-primary-400' : ''
                  }`}
                >
                  <header className={`shrink-0 border-b border-black/5 px-3 py-2.5 ${HEADER_BG[col.key]}`}>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="min-w-0 truncate text-sm font-semibold text-gray-900">{col.label}</h2>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${col.badgeClass}`}>
                        {cards.length}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-600">{col.hint}</p>
                    {followUps > 0 ? (
                      <p className="mt-1 text-[11px] font-semibold text-amber-900">
                        {followUps} à relancer
                      </p>
                    ) : null}
                  </header>
                  <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain px-2 py-2">
                    {cards.length === 0 ? (
                      <li className="flex flex-1">
                        <div
                          className={`flex min-h-[7.5rem] flex-1 items-center justify-center rounded-lg border border-dashed px-3 text-center text-xs ${
                            isOver
                              ? 'border-primary-400 bg-white/80 text-primary-700'
                              : 'border-gray-300/80 text-gray-400'
                          }`}
                        >
                          {isOver ? 'Déposer ici' : canDrag ? 'Déposez une carte ici' : 'Aucune candidature'}
                        </div>
                      </li>
                    ) : (
                      cards.map((app) => (
                        <li key={app.id}>
                          <KanbanCard
                            app={app}
                            badgeClass={col.badgeClass}
                            canDrag={canDrag}
                            moving={movingId === app.id}
                            dragging={draggingId === app.id}
                            onDragStart={() => setDraggingId(app.id)}
                            onDragEnd={endDrag}
                            onStatusChange={(status) => void onStatusChange(app.id, status)}
                            onMarkRelance={
                              onMarkRelance ? () => void onMarkRelance(app.id) : undefined
                            }
                          />
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
