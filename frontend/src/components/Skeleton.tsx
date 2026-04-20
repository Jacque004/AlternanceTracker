interface SkeletonProps {
  className?: string;
  /** Hauteur (ex: h-4, h-8, h-12) */
  height?: string;
  /** Largeur (ex: w-full, w-1/2) - par défaut w-full */
  width?: string;
  /** Forme ronde (cercle) */
  rounded?: 'default' | 'full' | 'none';
}

export default function Skeleton({ className = '', height = 'h-4', width = 'w-full', rounded = 'default' }: SkeletonProps) {
  const roundedClass = rounded === 'full' ? 'rounded-full' : rounded === 'none' ? 'rounded-none' : 'rounded-lg';
  return <div className={`skeleton ${roundedClass} ${height} ${width} ${className}`} aria-hidden />;
}

/** Bloc type ligne de liste (titre + sous-titre) */
export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Skeleton height="h-4" width="w-3/4" />
      <Skeleton height="h-3" width="w-1/2" />
    </div>
  );
}

/** Grille de cartes pour dashboard */
export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-white rounded-xl border border-gray-200 shadow-card animate-in">
          <div className="flex items-center gap-3">
            <Skeleton height="h-10" width="w-10" rounded="default" />
            <div className="flex-1 space-y-2">
              <Skeleton height="h-4" width="w-2/3" />
              <Skeleton height="h-3" width="w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Stats (chiffres) */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-white rounded-xl border border-gray-200 shadow-card animate-in">
          <Skeleton height="h-3" width="w-20" className="mb-2" />
          <Skeleton height="h-8" width="w-16" />
        </div>
      ))}
    </div>
  );
}

/** Grille calendrier (7 jours × 6 semaines) + en-tête mois et colonne latérale type page Calendrier */
export function SkeletonCalendarGrid() {
  const cellCount = 42;
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:items-start animate-in">
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Skeleton height="h-6" width="w-44" />
          <div className="flex items-center gap-2">
            <Skeleton height="h-8" width="w-10" />
            <Skeleton height="h-8" width="w-28" />
            <Skeleton height="h-8" width="w-10" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`wd-${i}`} className="bg-gray-50 py-2 flex justify-center">
              <Skeleton height="h-3" width="w-8" className="!rounded-sm" />
            </div>
          ))}
          {Array.from({ length: cellCount }).map((_, i) => (
            <div
              key={`day-${i}`}
              className="bg-white min-h-[3.25rem] sm:min-h-[3.75rem] flex flex-col items-center justify-start pt-2 px-1"
            >
              <Skeleton height="h-7" width="w-7" rounded="full" className="shrink-0" />
              <div className="mt-1.5 flex gap-0.5 justify-center">
                <Skeleton height="h-1.5" width="w-1.5" rounded="full" />
                <Skeleton height="h-1.5" width="w-1.5" rounded="full" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <Skeleton height="h-3" width="w-20" />
          <Skeleton height="h-3" width="w-20" />
        </div>
      </div>
      <aside className="w-full lg:w-[min(100%,380px)] shrink-0 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-4">
          <Skeleton height="h-3" width="w-32" className="mb-2" />
          <Skeleton height="h-4" width="w-full" className="mb-4" />
          <SkeletonLine />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-4 max-h-[min(420px,50vh)] lg:max-h-[min(520px,55vh)] overflow-hidden">
          <Skeleton height="h-3" width="w-40" className="mb-3" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLine key={i} />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

/** Liste d'éléments (lignes) */
export function SkeletonList({ lines = 5 }: { lines?: number }) {
  return (
    <div className="divide-y divide-gray-200">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="py-4 flex items-center justify-between gap-2 animate-in">
          <SkeletonLine />
          <Skeleton height="h-6" width="w-20" />
        </div>
      ))}
    </div>
  );
}
