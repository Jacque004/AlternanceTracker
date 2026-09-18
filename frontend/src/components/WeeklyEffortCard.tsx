import { Link } from 'react-router-dom';
import { streakLabel } from '../utils/weeklyEffort';

interface WeeklyTask {
  id: string;
  label: string;
  current: number;
  target: number;
  to: string;
  hint?: string;
}

interface WeeklyEffortCardProps {
  applicationsCurrent: number;
  applicationsTarget: number;
  relancesCurrent: number;
  relancesTarget: number;
  lettersCurrent: number;
  lettersTarget: number;
  streak: number;
  toRelanceWaiting?: number;
}

function TaskRow({ task }: { task: WeeklyTask }) {
  const done = task.current >= task.target;
  const ratio = task.target > 0 ? Math.min(100, (task.current / task.target) * 100) : 0;

  return (
    <li>
      <Link
        to={task.to}
        className="block rounded-xl border border-gray-200 bg-white px-3 py-3 hover:border-primary-300 hover:bg-primary-50/30 transition-colors min-h-[44px]"
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-semibold ${
              done
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-gray-300 bg-white text-transparent'
            }`}
            aria-hidden
          >
            ✓
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-800'}`}>
                {task.label}
              </p>
              <p className="text-sm tabular-nums text-gray-600">
                {task.current}/{task.target}
              </p>
            </div>
            {task.hint ? <p className="mt-0.5 text-xs text-gray-500">{task.hint}</p> : null}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${done ? 'bg-primary-600' : 'bg-primary-400'}`}
                style={{ width: `${ratio}%` }}
              />
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}

export function WeeklyEffortCard({
  applicationsCurrent,
  applicationsTarget,
  relancesCurrent,
  relancesTarget,
  lettersCurrent,
  lettersTarget,
  streak,
  toRelanceWaiting = 0,
}: WeeklyEffortCardProps) {
  const tasks: WeeklyTask[] = [
    {
      id: 'applications',
      label: `${applicationsTarget} candidature${applicationsTarget > 1 ? 's' : ''}`,
      current: applicationsCurrent,
      target: applicationsTarget,
      to: '/applications/new',
      hint: 'Ajoutées cette semaine',
    },
    {
      id: 'relances',
      label: `${relancesTarget} relance${relancesTarget > 1 ? 's' : ''}`,
      current: relancesCurrent,
      target: relancesTarget,
      to: '/applications',
      hint:
        toRelanceWaiting > 0
          ? `${toRelanceWaiting} encore en attente de suivi`
          : 'Marquer relancé depuis le tableau de bord ou le Kanban',
    },
    {
      id: 'letters',
      label: `${lettersTarget} lettre`,
      current: lettersCurrent,
      target: lettersTarget,
      to: '/preparer/lettres',
      hint: 'Générée ou enregistrée cette semaine',
    },
  ];

  const allDone = tasks.every((t) => t.current >= t.target);

  return (
    <section className="bg-white rounded-xl shadow-card border border-gray-200 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">À faire cette semaine</h2>
          <p className="mt-1 text-sm text-gray-500">
            Un rythme simple : candidater, relancer, écrire. Pas de classement.
          </p>
        </div>
        <Link
          to="/profile"
          className="text-xs font-medium text-primary-600 hover:underline shrink-0 sm:mt-1"
        >
          Ajuster l’objectif
        </Link>
      </div>

      <ul className="mt-4 space-y-2.5">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>

      <p className="mt-4 text-sm text-gray-700">
        {allDone ? 'Semaine tenue. ' : null}
        {streakLabel(streak)}
      </p>
    </section>
  );
}
