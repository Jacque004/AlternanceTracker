import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import PageTransition from './PageTransition';
import Footer from './Footer';
import OnboardingTour, { shouldShowOnboarding, markOnboardingDone } from './OnboardingTour';
import { useFocusTrap } from '../hooks/useFocusTrap';

const navItems = [
  { to: '/', label: 'Accueil', match: (path: string) => path === '/' },
  { to: '/applications', label: 'Candidatures', match: (path: string) => path.startsWith('/applications') },
  { to: '/calendar', label: 'Calendrier', match: (path: string) => path.startsWith('/calendar') },
  { to: '/preparer', label: 'Préparer', match: (path: string) => path.startsWith('/preparer') },
  { to: '/profile', label: 'Mon espace', match: (path: string) => path === '/profile' },
];

const Layout = () => {
  const { user, signOut } = useSupabaseAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const mobileMenuPanelRef = useRef<HTMLDivElement>(null);
  const mobileNavToggleRef = useRef<HTMLButtonElement>(null);
  const skipMobileFocusRestoreRef = useRef(false);

  useFocusTrap(mobileMenuPanelRef, mobileNavToggleRef, mobileOpen, skipMobileFocusRestoreRef);

  const closeMobileNavFromAction = () => {
    skipMobileFocusRestoreRef.current = true;
    setMobileOpen(false);
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  useEffect(() => {
    try {
      setShowOnboarding(!!user && shouldShowOnboarding());
    } catch {
      setShowOnboarding(false);
    }
  }, [user]);

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
    `flex items-center px-3 py-3 rounded-md text-base font-medium min-h-[44px] ${
      isActive
        ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-500'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
    }`;

  return (
    <div className="min-h-screen w-full min-w-0 flex flex-col bg-gradient-to-b from-gray-50 to-gray-100/80 overflow-x-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        Aller au contenu principal
      </a>

      {mobileOpen && (
        <button
          type="button"
          tabIndex={-1}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] lg:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <header className="sticky top-0 z-40 w-full min-w-0 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-sm pt-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex items-center gap-8">
              <Link
                to="/"
                className="flex-shrink-0 text-lg sm:text-xl font-bold tracking-tight text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg transition-colors duration-200 min-h-[44px] flex items-center"
              >
                AlternanceTracker
              </Link>
              {user ? (
                <nav className="hidden lg:flex lg:gap-0.5" aria-label="Navigation principale">
                  {navItems.map(({ to, label, match }) => {
                    const active = match(location.pathname);
                    return (
                      <Link
                        key={to}
                        to={to}
                        aria-current={active ? 'page' : undefined}
                        className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                          active
                            ? 'bg-primary-100 text-primary-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </nav>
              ) : null}
            </div>

            {user ? (
              <div className="hidden lg:flex lg:items-center lg:gap-4">
                <span
                  className="text-sm text-gray-600 truncate max-w-[140px]"
                  title={`${user?.firstName} ${user?.lastName}`}
                >
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
            ) : (
              <div className="hidden lg:flex lg:items-center lg:gap-3">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-medium text-primary-700 hover:text-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                >
                  Créer un compte
                </Link>
              </div>
            )}

            <div className="flex items-center gap-2 lg:hidden">
              <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[100px] sm:max-w-[120px]">
                {user?.firstName}
              </span>
              <button
                ref={mobileNavToggleRef}
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                className="p-2.5 -mr-0.5 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav-menu"
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
          <div
            ref={mobileMenuPanelRef}
            id="mobile-nav-menu"
            className="lg:hidden border-t border-gray-200 bg-white menu-enter shadow-lg max-h-[min(70vh,calc(100dvh-3.5rem))] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
          >
            <div className="pt-2 pb-4 px-4 space-y-1 overflow-y-auto overscroll-contain flex-1 min-h-0">
              {user
                ? navItems.map(({ to, label, match }) => {
                    const active = match(location.pathname);
                    return (
                      <Link
                        key={to}
                        to={to}
                        aria-current={active ? 'page' : undefined}
                        className={linkClass(active)}
                        onClick={closeMobileNavFromAction}
                      >
                        {label}
                      </Link>
                    );
                  })
                : null}

              <div className="pt-3 mt-3 border-t border-gray-200">
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileNavFromAction();
                      signOut();
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                  >
                    Déconnexion
                  </button>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      onClick={closeMobileNavFromAction}
                      className="block w-full text-left px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 rounded-md"
                    >
                      Connexion
                    </Link>
                    <Link
                      to="/register"
                      onClick={closeMobileNavFromAction}
                      className="block w-full text-left px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                    >
                      Créer un compte
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {showOnboarding && (
        <OnboardingTour
          enabled={showOnboarding}
          onFinish={() => {
            markOnboardingDone();
            setShowOnboarding(false);
          }}
        />
      )}

      <main
        id="main"
        className="flex-1 min-w-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-safe box-border"
        role="main"
      >
        <PageTransition className="min-w-0 w-full max-w-full">
          <Outlet />
        </PageTransition>
      </main>

      <Footer />
    </div>
  );
};

export default Layout;
