const APropos = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">À propos</h1>

      <div className="bg-white shadow-card rounded-xl border border-gray-200 p-6 space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">AlternanceTracker</h2>
          <p className="text-gray-600 leading-relaxed">
            AlternanceTracker est une application dédiée aux étudiants en recherche d'alternance.
            Elle vous aide à organiser vos candidatures, à améliorer votre CV et vos lettres de motivation,
            et à vous préparer aux entretiens.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Fonctionnalités</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li><strong>Mes candidatures</strong> — Suivez et gérez toutes vos candidatures en un seul endroit.</li>
            <li><strong>Conseils CV</strong> — Des recommandations pour optimiser votre CV.</li>
            <li><strong>Analyser une offre</strong> — Analysez les offres d'emploi pour mieux cibler vos candidatures.</li>
            <li><strong>Coaching</strong> — Des ressources pour vous préparer aux entretiens.</li>
            <li><strong>Modèles de lettres</strong> — Des exemples de lettres de motivation pour vous inspirer.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
          <p className="text-gray-600 leading-relaxed">
            Pour toute question ou suggestion, n'hésitez pas à nous contacter via les canaux indiqués
            dans votre espace ou sur la page d'accueil.
          </p>
        </section>

        <p className="text-sm text-gray-500 pt-4 border-t border-gray-200">
          © AlternanceTracker — Outil d'accompagnement à la recherche d'alternance.
        </p>
      </div>
    </div>
  );
};

export default APropos;
