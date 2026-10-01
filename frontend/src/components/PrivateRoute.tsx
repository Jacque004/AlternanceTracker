import { ReactNode, useEffect, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { rememberPostLoginPath, safeNextPath } from '../utils/safeNextPath';

const GUEST_PATHS = new Set(['/', '/a-propos', '/politique-confidentialite', '/cgu']);

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { session, loading } = useSupabaseAuth();
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const guestAllowed = GUEST_PATHS.has(path);
  const loginState = useMemo(
    () => ({
      from: {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
    }),
    [location.pathname, location.search, location.hash]
  );

  useEffect(() => {
    if (loading || session || guestAllowed) return;
    rememberPostLoginPath(safeNextPath(loginState.from));
  }, [loading, session, guestAllowed, loginState]);

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 min-h-screen"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">Chargement de la session…</span>
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"
          aria-hidden
        />
      </div>
    );
  }

  if (!session) {
    // Accueil, à propos et pages légales restent accessibles sans compte,
    // y compris avec un slash final (/a-propos/).
    if (guestAllowed) {
      return <>{children}</>;
    }
    return <Navigate to="/login" replace state={loginState} />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
