import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/preparer/cv', label: 'Mon CV', shortLabel: 'CV' },
  { to: '/preparer/lettres', label: 'Lettres', shortLabel: 'Lettres' },
  { to: '/preparer/analyser-offre', label: 'Analyser une offre', shortLabel: 'Offre' },
  { to: '/preparer/conseils', label: 'Conseils', shortLabel: 'Conseils' },
];

export default function PreparerLayout() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Préparer ma candidature
        </h1>
        <p className="mt-1 text-gray-600">
          CV, lettres de motivation, analyse d’offre et conseils pour mettre toutes les chances de votre côté.
        </p>
      </div>

      <nav
        className="flex rounded-xl bg-white/80 p-1 shadow-card border border-gray-200/80 mb-8 overflow-x-auto"
        aria-label="Sections Préparer"
      >
        <ul className="flex gap-1 min-w-0 w-full">
          {tabs.map(({ to, label, shortLabel }) => (
            <li key={to} className="flex-1 min-w-0">
              <NavLink
                to={to}
                end={false}
                className={({ isActive }) =>
                  `block text-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet />
    </div>
  );
}
