import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Landing() {
  return (
    <div className="max-w-3xl mx-auto stack-page page-shell">
      <section className="space-y-3 sm:space-y-4">
        <h1>
          <Logo className="h-16 w-auto sm:h-20" />
        </h1>

        <p className="text-base sm:text-lg text-gray-600">
          Suivez vos candidatures, trouvez des offres d’entreprises, et envoyez votre rythme d’alternance à un recruteur.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/register"
            className="inline-flex justify-center items-center px-5 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Créer un compte et tester
          </Link>
          <Link
            to="/login"
            className="inline-flex justify-center items-center px-5 py-3 rounded-lg bg-white text-primary-700 font-medium border border-primary-200 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Je suis déjà inscrit
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5 space-y-2">
          <h2 className="font-semibold text-gray-900">Suivi des candidatures</h2>
          <p className="text-sm text-gray-600">Statuts, relances et entretiens au même endroit, en liste ou en colonnes.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5 space-y-2">
          <h2 className="font-semibold text-gray-900">Offres d’entreprises</h2>
          <p className="text-sm text-gray-600">Des annonces d’alternance et de stage, filtrées selon votre profil.</p>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 shadow-card p-4 sm:p-5 space-y-2">
          <h2 className="font-semibold text-gray-900">Calendrier de rythme</h2>
          <p className="text-sm text-gray-600">Jours d’école et d’entreprise sur 12 ou 24 mois, avec un lien pour le recruteur.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5 space-y-2">
          <h2 className="font-semibold text-gray-900">CV, lettres, entretien</h2>
          <p className="text-sm text-gray-600">Un dossier préparé à partir de l’offre, pas une liste de conseils génériques.</p>
        </div>
      </section>

      <section className="bg-gradient-to-b from-primary-50 to-white rounded-2xl border border-primary-100 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">En 3 étapes</h2>
        <ol className="mt-3 space-y-2 text-sm text-gray-700 list-decimal list-inside">
          <li>Créez un compte.</li>
          <li>Enregistrez vos candidatures, ou partez d’une offre.</li>
          <li>Préparez le dossier et partagez votre rythme avant l’entretien.</li>
        </ol>
      </section>
    </div>
  );
}

