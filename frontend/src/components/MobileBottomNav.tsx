import { Link, useLocation } from 'react-router-dom';

const tabs = [
  {
    to: '/',
    label: 'Accueil',
    match: (path: string) => path === '/',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
      </svg>
    ),
  },
  {
    to: '/applications',
    label: 'Suivi',
    match: (path: string) => path.startsWith('/applications'),
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h10M4 17h7" />
      </svg>
    ),
  },
  {
    to: '/calendar',
    label: 'Agenda',
    match: (path: string) => path.startsWith('/calendar'),
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v3m8-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      </svg>
    ),
  },
  {
    to: '/preparer',
    label: 'Préparer',
    match: (path: string) => path.startsWith('/preparer'),
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.5v11M8 8.5h5.5a2.5 2.5 0 0 1 0 5H8V8.5z" />
      </svg>
    ),
  },
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Navigation mobile"
    >
      <ul className="grid grid-cols-4 max-w-lg mx-auto">
        {tabs.map(({ to, label, match, icon }) => {
          const active = match(location.pathname);
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-1 text-[11px] font-medium ${
                  active ? 'text-primary-700' : 'text-gray-500'
                }`}
              >
                {icon}
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
