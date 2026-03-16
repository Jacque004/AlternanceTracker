import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import PageTransition from './PageTransition';
import Footer from './Footer';

const navItems = [
  { to: '/', label: 'Accueil', match: (path: string) => path === '/' },
  { to: '/applications', label: 'Candidatures', match: (path: string) => path.startsWith('/applications') },
  { to: '/preparer', label: 'Préparer', match: (path: string) => path.startsWith('/preparer') },
  { to: '/profile', label: 'Profil', match: (path: string) => path === '/profile' },
];

const ONBOARDING_KEY = 'alternancetracker_onboarding_done';

const Layout = () => {
  const { user, signOut } = useSupabaseAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      setShowOnboarding(!localStorage.getItem(ONBOARDING_KEY));
    } catch {
      setShowOnboarding(false);
    }
  }, []);

  const dismissOnboarding = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {}
    setShowOnboarding(false);
  };

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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100/80">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        Aller au contenu principal
      </a>

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex items-center gap-8">
              <Link
                to="/"
                className="flex-shrink-0 text-xl font-bold tracking-tight text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg transition-colors duration-200"
              >
                AlternanceTracker
              </Link>
              <nav className="hidden lg:flex lg:gap-0.5" aria-label="Navigation principale">
                {navItems.map(({ to, label, match }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      match(location.pathname)
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
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
          <div className="lg:hidden border-t border-gray-200 bg-white menu-enter" role="dialog" aria-label="Menu de navigation">
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
      </header>

      {showOnboarding && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-card animate-in">
            <div>
              <p className="font-medium text-primary-900">Bienvenue sur AlternanceTracker</p>
              <p className="text-sm text-primary-800 mt-0.5">
                Commencez par <Link to="/applications/new" className="underline font-medium">ajouter une candidature</Link>, 
                complétez votre <Link to="/profile" className="underline font-medium">profil</Link> et 
                utilisez <Link to="/preparer/lettres" className="underline font-medium">Préparer → Lettres</Link> pour générer vos lettres avec l'IA.
              </p>
            </div>
            <button type="button" onClick={dismissOnboarding} className="shrink-0 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded">
              Compris
            </button>
          </div>
        </div>
      )}

      <main id="main" className="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8" role="main">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <Footer />
    </div>
  );
};

export default Layout;
