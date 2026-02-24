import { useState } from 'react';
import { Link } from 'react-router-dom';

type SectionId = 'cv' | 'lettre' | 'recherche' | 'reseau' | 'entretien' | 'suivi';

const sections: { id: SectionId; title: string; icon: string }[] = [
  { id: 'cv', title: 'CV et profil', icon: '📄' },
  { id: 'lettre', title: 'Lettre de motivation', icon: '✉️' },
  { id: 'recherche', title: 'Stratégie de recherche', icon: '🔍' },
  { id: 'reseau', title: 'Réseau et visibilité', icon: '🤝' },
  { id: 'entretien', title: 'Réussir l\'entretien', icon: '🎯' },
  { id: 'suivi', title: 'Relances et suivi', icon: '📌' },
];

const Coaching = () => {
  const [openSection, setOpenSection] = useState<SectionId | null>('cv');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Coaching alternance
        </h1>
        <p className="mt-2 text-gray-600">
          Les techniques détaillées pour mettre toutes les chances de votre côté et décrocher votre contrat en alternance, quel que soit votre domaine (commerce, santé, tech, bâtiment, design, etc.).
        </p>
      </div>

      {/* Encadré : lien vers Mes candidatures */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-5">
        <p className="text-primary-900 font-medium mb-1">📋 Tableau de suivi</p>
        <p className="text-primary-800 text-sm">
          Comme recommandé dans les sections ci-dessous, tenez un tableau (entreprise, poste, date de candidature, relance, réponse). 
          Suivez vos candidatures dans <Link to="/applications" className="font-semibold underline hover:text-primary-700">Mes candidatures</Link> pour ne rien oublier.
        </p>
      </div>

      {/* Navigation rapide */}
      <div className="bg-white shadow rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Aller à une section :</p>
        <div className="flex flex-wrap gap-2">
          {sections.map(({ id, title, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setOpenSection(openSection === id ? null : id)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                openSection === id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{icon}</span>
              <span>{title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. CV et profil */}
        <SectionCard
          id="cv"
          title="CV et profil"
          icon="📄"
          isOpen={openSection === 'cv'}
          onToggle={() => setOpenSection(openSection === 'cv' ? null : 'cv')}
        >
          <h3 className="text-lg font-semibold text-gray-900 mt-4 first:mt-0">Adapter son CV à l’alternance</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 my-2">
            <li><strong>En-tête clair</strong> : indiquez en haut « Recherche alternance [durée] – [intitulé formation] » et les dates de disponibilité.</li>
            <li><strong>Objectif / accroche</strong> : une phrase qui lie votre formation, votre niveau et le type d’entreprise visé (ex. : « Étudiant en 2e année de [formation], je recherche une alternance de 12 mois dans [votre domaine : commerce, santé, informatique, bâtiment, design, etc.]. »).</li>
            <li><strong>Compétences métier et savoir-faire</strong> : selon votre filière (techniques, commerciales, créatives, soins, gestion, etc.), listez les compétences clés, outils et certifications attendus dans votre secteur.</li>
            <li><strong>Projets et réalisations</strong> : stages, TP, projets d’études, missions, jobs, bénévolat, selon votre filière. Décrivez le contexte, votre rôle et le résultat.</li>
            <li><strong>Savoir-être</strong> : travail en équipe, rigueur, autonomie, relation client… avec un exemple concret si possible.</li>
          </ul>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">Erreurs à éviter</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 my-2">
            <li>CV trop long (1 page pour un profil junior).</li>
            <li>CV générique non adapté au secteur ou au poste.</li>
            <li>Fautes d’orthographe : relisez et faites relire (outil + humain).</li>
          </ul>
        </SectionCard>

        {/* 2. Lettre de motivation */}
        <SectionCard
          id="lettre"
          title="Lettre de motivation"
          icon="✉️"
          isOpen={openSection === 'lettre'}
          onToggle={() => setOpenSection(openSection === 'lettre' ? null : 'lettre')}
        >
          <h3 className="text-lg font-semibold text-gray-900 mt-4 first:mt-0">Structure efficace</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 my-2">
            <li><strong>Paragraphe 1</strong> : qui vous êtes (formation, année), ce que vous cherchez (alternance, durée) et pourquoi cette entreprise (secteur, produit, valeurs ou actualité).</li>
            <li><strong>Paragraphe 2</strong> : ce que vous apportez (compétences, projets, expériences) en lien direct avec le poste ou le secteur.</li>
            <li><strong>Paragraphe 3</strong> : disponibilité, rythme d’alternance et proposition d’échange (entretien, visite).</li>
          </ul>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">Techniques qui marchent</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 my-2">
            <li>Personnaliser chaque lettre : nom de l’entreprise, du recruteur si connu, référence à une offre ou un projet.</li>
            <li>Utiliser des verbes d’action et des chiffres (durée de stage, nombre de projets, etc.).</li>
            <li>Rester court : une page, 3 paragraphes, pas de redite avec le CV.</li>
            <li>Des modèles par type d'entreprise sont disponibles dans <Link to="/modeles-lettres" className="font-medium text-primary-600 hover:underline">Modèles de lettres</Link>.</li>
          </ul>
        </SectionCard>

        {/* 3. Stratégie de recherche */}
        <SectionCard
          id="recherche"
          title="Stratégie de recherche"
          icon="🔍"
          isOpen={openSection === 'recherche'}
          onToggle={() => setOpenSection(openSection === 'recherche' ? null : 'recherche')}
        >
          <h3 className="text-lg font-semibold text-gray-900 mt-4 first:mt-0">Où et comment chercher</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 my-2">
            <li><strong>Job boards alternance</strong> : alternance.pro, La Bonne Alternance, Indeed, LinkedIn (filtre « Alternance »), sites des écoles.</li>
            <li><strong>Site carrière des entreprises</strong> : ciblez 20–30 entreprises qui vous plaisent et postulez via leur site.</li>
            <li><strong>Candidatures spontanées</strong> : très efficaces si vous ciblez des PME/ETI et personnalisez chaque envoi.</li>
            <li><strong>Calendrier</strong> : commencez 4–6 mois avant la rentrée ; les recrutements alternance se ferment tôt.</li>
          </ul>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">Organisation</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 my-2">
            <li>Tenir un tableau (entreprise, poste, date de candidature, relance, réponse) pour ne rien oublier.</li>
            <li>Viser un volume régulier : 5–10 candidatures par semaine plutôt que tout en une fois.</li>
            <li>Alterner offres publiées et candidatures spontanées pour multiplier les chances.</li>
          </ul>
        </SectionCard>

        {/* 4. Réseau et visibilité */}
        <SectionCard
          id="reseau"
          title="Réseau et visibilité"
          icon="🤝"
          isOpen={openSection === 'reseau'}
          onToggle={() => setOpenSection(openSection === 'reseau' ? null : 'reseau')}
        >
          <h3 className="text-lg font-semibold text-gray-900 mt-4 first:mt-0">LinkedIn</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 my-2">
            <li>Photo pro, titre clair (ex. : « Étudiant en [formation] – Recherche alternance 2025–2026 »).</li>
            <li>Résumé court : formation, compétences, type d’alternance recherchée.</li>
            <li>Ajoutez recruteurs et professionnels du secteur ; envoyez un message personnalisé avec chaque demande.</li>
            <li>Publiez ou commentez (projets, articles) pour augmenter votre visibilité.</li>
          </ul>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">Réseau physique et événements</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 my-2">
            <li>Forums alternance, salons métiers, journées portes ouvertes des entreprises.</li>
            <li>Alumni de votre école : demandez des conseils et des contacts (souvent plus efficaces que les offres anonymes).</li>
            <li>Professeurs et intervenants : ils ont souvent des contacts en entreprise.</li>
          </ul>
        </SectionCard>

        {/* 5. Entretien */}
        <SectionCard
          id="entretien"
          title="Réussir l'entretien"
          icon="🎯"
          isOpen={openSection === 'entretien'}
          onToggle={() => setOpenSection(openSection === 'entretien' ? null : 'entretien')}
        >
          <h3 className="text-lg font-semibold text-gray-900 mt-4 first:mt-0">Avant l’entretien</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 my-2">
            <li>Recherchez l’entreprise : activité, produits, actualités, valeurs.</li>
            <li>Relisez l’offre et votre CV/lettre pour anticiper les questions.</li>
            <li>Préparez des exemples (projet, stage, difficulté surmontée) avec la méthode STAR (Situation, Tâche, Action, Résultat).</li>
            <li>Préparez 2–3 questions à poser (missions, équipe, rythme école/entreprise, évolution).</li>
          </ul>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">Pendant l’entretien</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 my-2">
            <li>Écoutez, répondez de façon structurée et concise.</li>
            <li>Montrez votre motivation pour l’alternance et pour l’entreprise, pas seulement pour le diplôme.</li>
            <li>Parlez de ce que vous voulez apprendre et de comment vous pouvez être utile.</li>
            <li>Notez le nom du ou des interlocuteurs pour la relance.</li>
          </ul>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">Après l’entretien</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 my-2">
            <li>Envoyez un mail de remerciement sous 24 h (courtoisie + rappel de votre intérêt).</li>
          </ul>
        </SectionCard>

        {/* 6. Relances et suivi */}
        <SectionCard
          id="suivi"
          title="Relances et suivi"
          icon="📌"
          isOpen={openSection === 'suivi'}
          onToggle={() => setOpenSection(openSection === 'suivi' ? null : 'suivi')}
        >
          <h3 className="text-lg font-semibold text-gray-900 mt-4 first:mt-0">Quand et comment relancer</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 my-2">
            <li>Après 7–10 jours sans réponse sur une candidature, relancez par e-mail (courtois, court, rappel de votre profil et de votre motivation).</li>
            <li>Une deuxième relance possible 1–2 semaines plus tard ; ensuite passer à autre chose.</li>
            <li>Après un entretien : si pas de nouvelle à la date indiquée, une relance polie est bien vue.</li>
          </ul>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">Garder le cap</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 my-2">
            <li>Les refus font partie du processus : analysez les retours éventuels et ajustez CV/lettre/entretien.</li>
            <li>Persévérez : beaucoup d’alternances se signent après plusieurs dizaines de candidatures.</li>
            <li>Utilisez <Link to="/applications" className="font-medium text-primary-600 hover:underline">Mes candidatures</Link> pour suivre vos candidatures et ne rien laisser passer.</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
};

function SectionCard({
  id,
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <span>{icon}</span>
          {title}
        </span>
        <span className="text-gray-500">
          {isOpen ? '▼' : '▶'}
        </span>
      </button>
      {isOpen && (
        <div id={id} className="px-6 pb-6 pt-0 border-t border-gray-100 text-gray-700">
          {children}
        </div>
      )}
    </div>
  );
}

export default Coaching;
