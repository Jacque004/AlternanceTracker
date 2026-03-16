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
