import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { session, loading } = useSupabaseAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!session) {
    // La page d'accueil (landing) est accessible sans compte.
    if (location.pathname === '/' || location.pathname === '/a-propos') {
      return <>{children}</>;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;

