import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import Dashboard from './Dashboard';
import Landing from './Landing';

export default function HomeRoute() {
  const { session, loading } = useSupabaseAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return session ? <Dashboard /> : <Landing />;
}

