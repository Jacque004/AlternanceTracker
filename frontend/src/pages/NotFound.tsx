import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto text-center page-shell">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Page introuvable</h1>
      <p className="mt-2 text-sm sm:text-base text-gray-600">
        Cette adresse ne correspond à aucune page d’AlternanceTracker.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex justify-center items-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        Retour à l’accueil
      </Link>
    </div>
  );
}
