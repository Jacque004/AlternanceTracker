import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Application } from '../types';
import {
  APPLICATION_STATUS_OPTIONS,
  PIPELINE_COLUMNS,
  applicationStatusLabel,
  type ApplicationStatus,
} from '../utils/applicationStatus';
import { formatDisplayDate, formatDisplayTime } from '../utils/dateDisplay';

interface ApplicationsKanbanProps {
  applications: Application[];
  onStatusChange: (id: number, status: ApplicationStatus) => Promise<void>;
  movingId: number | null;
}

export function ApplicationsKanban({
  applications,
  onStatusChange,
  movingId,
}: ApplicationsKanbanProps) {
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStatus | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [canDrag, setCanDrag] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    const update = () => setCanDrag(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const byStatus = (key: ApplicationStatus) => applications.filter((a) => a.status === key);

  const handleDrop = async (status: ApplicationStatus, event: React.DragEvent) => {
    event.preventDefault();
    setDragOverColumn(null);
    const raw = event.dataTransfer.getData('text/plain');
    const id = Number(raw);
    if (!id) return;
    const app = applications.find((a) => a.id === id);
    if (!app || app.status === status) {
      setDraggingId(null);
      return;
    }
    await onStatusChange(id, status);
    setDraggingId(null);
  };

  return (
    <>
      <p className="sr-only">
        Tableau Kanban des candidatures. Sur ordinateur, glissez une carte. Sur téléphone, changez le
        statut avec la liste ou faites défiler les colonnes.
      </p>
      <p className="sm:hidden text-xs text-gray-500 mb-2 px-0.5">
        Faites défiler les colonnes. Le statut se change avec le menu de chaque carte.
      </p>
      <div className="overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:snap-none scroll-px-3">
      <div className="flex gap-3 min-w-max sm:min-w-0 sm:grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 items-start">
        {PIPELINE_COLUMNS.map((col) => {
          const cards = byStatus(col.key);
          const isOver = dragOverColumn === col.key;
          return (
            <section
              key={col.key}
              aria-label={`${col.label}, ${cards.length} candidature${cards.length > 1 ? 's' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverColumn(col.key);
              }}
              onDragLeave={() => {
                setDragOverColumn((current) => (current === col.key ? null : current));
              }}
              onDrop={(e) => void handleDrop(col.key, e)}
              className={`w-[min(82vw,19rem)] sm:w-auto shrink-0 snap-center sm:snap-align-none rounded-xl border bg-gray-50/80 ${col.columnAccent} border-t-4 border-gray-200 min-h-[12rem] flex flex-col ${
                isOver ? 'ring-2 ring-primary-400 bg-primary-50/40' : ''
              }`}
            >
              <header className="px-3 py-2.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 truncate">{col.label}</h2>
                  <p className="text-xs text-gray-500">{col.hint}</p>
                </div>
                <span className="tabular-nums text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                  {cards.length}
                </span>
              </header>
              <ul className="px-2 pb-2 space-y-2 flex-1">
                {cards.length === 0 ? (
                  <li className="text-xs text-gray-400 px-1 py-6 text-center">
                    {canDrag ? 'Déposez une carte ici' : 'Aucune candidature'}
                  </li>
                ) : (
                  cards.map((app) => (
                    <li key={app.id}>
                      <article
                        draggable={canDrag}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', String(app.id));
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggingId(app.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverColumn(null);
                        }}
                        className={`rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow ${
                          canDrag ? 'cursor-grab active:cursor-grabbing' : ''
                        } ${
                          draggingId === app.id || movingId === app.id ? 'opacity-60' : ''
                        }`}
                      >
                        <Link
                          to={`/applications/${app.id}/edit`}
                          className="block min-w-0"
                        >
                          <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-2">
                            {app.companyName}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{app.position}</p>
                          {app.status === 'interview' && app.interviewDate ? (
                            <p className="text-xs text-blue-700 mt-1.5">
                              {formatDisplayDate(app.interviewDate)}
                              {app.interviewTime ? ` · ${formatDisplayTime(app.interviewTime)}` : ''}
                            </p>
                          ) : app.lastRelanceAt && app.status === 'followed_up' ? (
                            <p className="text-xs text-orange-800 mt-1.5">
                              Relancé le {formatDisplayDate(app.lastRelanceAt)}
                            </p>
                          ) : app.applicationDate ? (
                            <p className="text-xs text-gray-400 mt-1.5">
                              {formatDisplayDate(app.applicationDate)}
                            </p>
                          ) : null}
                        </Link>
                        <label className="sr-only" htmlFor={`kanban-status-${app.id}`}>
                          Statut de {app.companyName}
                        </label>
                        <select
                          id={`kanban-status-${app.id}`}
                          value={app.status}
                          disabled={movingId === app.id}
                          onChange={(e) =>
                            void onStatusChange(app.id, e.target.value as ApplicationStatus)
                          }
                          className="mt-2 w-full text-sm rounded-md border-gray-300 py-2 min-h-[44px] focus:border-primary-500 focus:ring-primary-500"
                          aria-label={`Changer le statut : ${applicationStatusLabel(app.status)}`}
                        >
                          {APPLICATION_STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </article>
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>
      </div>
    </>
  );
}
