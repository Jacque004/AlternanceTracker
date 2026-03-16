import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white/80 backdrop-blur-sm" role="contentinfo">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} AlternanceTracker
          </p>
          <nav className="flex items-center gap-6" aria-label="Pied de page">
            <Link
              to="/a-propos"
              className="text-sm text-gray-500 hover:text-primary-600 transition-colors duration-200"
            >
              À propos
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
