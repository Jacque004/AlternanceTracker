import LoadingSpinner from './LoadingSpinner';

export default function RouteFallback() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 min-h-[40vh] page-shell"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Chargement de la page…</span>
      <LoadingSpinner size="lg" />
    </div>
  );
}
