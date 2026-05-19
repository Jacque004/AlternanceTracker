import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading } = useSupabaseAuth();

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 min-h-[40vh]"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">Vérification des droits…</span>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" aria-hidden />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
