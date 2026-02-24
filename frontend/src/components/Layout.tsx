import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

const navItems = [
  { to: '/', label: 'Tableau de bord', match: (path: string) => path === '/' },
  { to: '/applications', label: 'Mes candidatures', match: (path: string) => path.startsWith('/applications') },
  { to: '/conseils-cv', label: 'Conseils CV', match: (path: string) => path === '/conseils-cv' },
  { to: '/analyser-offre', label: 'Analyser une offre', match: (path: string) => path === '/analyser-offre' },
  { to: '/coaching', label: 'Coaching', match: (path: string) => path === '/coaching' },
  { to: '/modeles-lettres', label: 'Modèles de lettres', match: (path: string) => path === '/modeles-lettres' },
  { to: '/profile', label: 'Profil', match: (path: string) => path === '/profile' },
];

const Layout = () => {
  const { user, signOut } = useSupabaseAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const linkClass = (isActive: boolean) =>
    `block px-3 py-2 rounded-md text-base font-medium ${
      isActive
        ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-500'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        Aller au contenu principal
      </a>

      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex items-center">
              <Link
                to="/"
                className="flex-shrink-0 text-xl font-bold text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              >
                AlternanceTracker
              </Link>
              <div className="hidden lg:ml-8 lg:flex lg:gap-1">
                {navItems.map(({ to, label, match }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium rounded-t ${
                      match(location.pathname)
                        ? 'border-primary-500 text-gray-900 bg-gray-50/50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex lg:items-center lg:gap-4">
              <span className="text-sm text-gray-600 truncate max-w-[140px]" title={`${user?.firstName} ${user?.lastName}`}>
                {user?.firstName} {user?.lastName}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-3 py-1.5"
              >
                Déconnexion
              </button>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[100px] sm:max-w-[120px]">
                {user?.firstName}
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              >
                {mobileOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white" role="dialog" aria-label="Menu de navigation">
            <div className="pt-2 pb-4 px-4 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {navItems.map(({ to, label, match }) => (
                <Link
                  key={to}
                  to={to}
                  className={linkClass(match(location.pathname))}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <div className="pt-3 mt-3 border-t border-gray-200">
                <p className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">Compte</p>
                <p className="px-3 py-2 text-sm text-gray-700">
                  {user?.firstName} {user?.lastName}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main id="main" className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8" role="main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
