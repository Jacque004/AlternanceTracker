import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <section className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-sm">
          <span aria-hidden>✨</span>
          <span>Votre tableau de bord pour décrocher l’alternance</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
          AlternanceTracker
          <span className="text-primary-600">.</span>
        </h1>

        <p className="text-lg text-gray-600">
          Organisez vos candidatures, préparez votre CV et vos lettres, et gagnez du temps avec des conseils ciblés.
          <br />
          <span className="font-medium text-gray-800">Pour tester les fonctionnalités, créez un compte.</span>
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

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-5 space-y-2">
          <div className="text-2xl" aria-hidden>
            📋
          </div>
          <h2 className="font-semibold text-gray-900">Mes candidatures</h2>
          <p className="text-sm text-gray-600">Suivez les statuts, relances et entretiens depuis un seul endroit.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-5 space-y-2">
          <div className="text-2xl" aria-hidden>
            📄
          </div>
          <h2 className="font-semibold text-gray-900">Conseils CV & lettres</h2>
          <p className="text-sm text-gray-600">Améliorez votre dossier grâce à des recommandations structurées.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-5 space-y-2">
          <div className="text-2xl" aria-hidden>
            🔍
          </div>
          <h2 className="font-semibold text-gray-900">Analyse d’offre</h2>
          <p className="text-sm text-gray-600">Obtenez des conseils pour mieux cibler votre candidature.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-5 space-y-2">
          <div className="text-2xl" aria-hidden>
            🎯
          </div>
          <h2 className="font-semibold text-gray-900">Coaching & préparation</h2>
          <p className="text-sm text-gray-600">Des ressources pour vous préparer aux entretiens.</p>
        </div>
      </section>

      <section className="bg-gradient-to-b from-primary-50 to-white rounded-2xl border border-primary-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900">En 3 étapes</h3>
        <ol className="mt-3 space-y-2 text-sm text-gray-700 list-decimal list-inside">
          <li>Créez votre compte (1 minute).</li>
          <li>Complétez votre profil.</li>
          <li>Commencez à tester : candidatures, analyses, lettres.</li>
        </ol>
      </section>
    </div>
  );
}

