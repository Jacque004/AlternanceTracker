import { lazy, Suspense } from 'react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import RouteFallback from '../components/RouteFallback';

const Dashboard = lazy(() => import('./Dashboard'));
const Landing = lazy(() => import('./Landing'));

export default function HomeRoute() {
  const { session, loading } = useSupabaseAuth();

  if (loading) {
    return <RouteFallback />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      {session ? <Dashboard /> : <Landing />}
    </Suspense>
  );
}
