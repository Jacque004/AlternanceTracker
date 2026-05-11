import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import Dashboard from './Dashboard';
import Landing from './Landing';

export default function HomeRoute() {
  const { session, loading } = useSupabaseAuth();

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 min-h-[50vh]"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">Chargement…</span>
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"
          aria-hidden
        />
      </div>
    );
  }

  return session ? <Dashboard /> : <Landing />;
}

