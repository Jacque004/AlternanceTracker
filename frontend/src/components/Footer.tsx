import { Link } from 'react-router-dom';

const linkClass =
  'text-sm text-gray-500 hover:text-primary-600 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded';

export default function Footer() {
  return (
    <footer
      className="mt-auto w-full min-w-0 border-t border-gray-200 bg-white/80 backdrop-blur-sm pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto py-5 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 text-center sm:text-left">
            © {new Date().getFullYear()} AlternanceTracker
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Informations légales">
            <Link to="/politique-confidentialite" className={linkClass}>
              Politique de confidentialité
            </Link>
            <Link to="/cgu" className={linkClass}>
              Conditions générales d&apos;utilisation
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
