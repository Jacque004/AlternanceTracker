import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

type TemplateId = 'pme' | 'grande_entreprise' | 'startup' | 'association' | 'public' | 'cabinet';

const TEMPLATES: {
  id: TemplateId;
  title: string;
  subtitle: string;
  tip: string;
  body: string;
}[] = [
  {
    id: 'pme',
    title: 'PME / TPE',
    subtitle: 'Petite ou moyenne entreprise',
    tip: 'Mettez en avant votre polyvalence, votre envie de vous investir et de voir le concret. Les PME recherchent des profils opérationnels et motivés.',
    body: `Madame, Monsieur,

Étudiant(e) en [formation] en recherche d'une alternance pour la rentrée [année], je suis vivement intéressé(e) par votre entreprise [secteur d'activité] et par les missions que vous proposez.

Au sein de [nom entreprise], je souhaite mettre à profit ma [compétence 1], ma [compétence 2] et mon sens du [savoir-être] pour contribuer à [type de mission ou objectif]. Mon parcours (stages, projets, [expérience]) m'a permis de [acquisition clé], et je suis convaincu(e) que votre structure est un cadre idéal pour poursuivre mon apprentissage tout en apportant une réelle plus-value.

Je reste à votre disposition pour un échange et vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

[Votre prénom et nom]
[Email] | [Téléphone]`,
  },
  {
    id: 'grande_entreprise',
    title: 'Grande entreprise / Groupe',
    subtitle: 'ETI, grand groupe, groupe international',
    tip: 'Soulignez votre capacité à vous intégrer dans une structure organisée, à respecter des process et à travailler en équipe. Montrez que vous connaissez les valeurs et l’actualité du groupe.',
    body: `Madame, Monsieur,

Actuellement en [année] de [formation], je recherche une alternance à compter de [date] et suis particulièrement attiré(e) par [nom entreprise] et les valeurs que vous portez [citer une valeur ou un axe stratégique si connu].

Mon parcours en [formation] et mes expériences ([stage, projet]) m'ont permis de développer [compétence 1], [compétence 2] et une réelle capacité d'adaptation en environnement structuré. Je suis motivé(e) à l'idée de rejoindre vos équipes pour [type de mission] et de contribuer à [objectif ou domaine].

Je me tiens à votre disposition pour échanger lors d'un entretien et vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

[Votre prénom et nom]
[Email] | [Téléphone]
[Profil LinkedIn si pertinent]`,
  },
  {
    id: 'startup',
    title: 'Startup',
    subtitle: 'Jeune entreprise en croissance',
    tip: 'Montrez votre goût pour l’initiative, la rapidité et l’envie d’apprendre vite. Les startups apprécient les profils autonomes et prêts à s’investir sur des sujets variés.',
    body: `Madame, Monsieur,

Étudiant(e) en [formation] et en recherche d'alternance pour [période], je suis très intéressé(e) par [nom startup] et le [produit / service / secteur] que vous développez.

En rejoignant votre équipe, je souhaite apprendre en conditions réelles, prendre des responsabilités et m'investir sur [type de missions]. Mon expérience en [stage / projet] et ma curiosité pour [sujet lié] me permettent de [apport concret]. Je suis à l'aise avec [outil, méthode] et souhaite mettre cette dynamique au service de votre croissance.

Je serais ravi(e) d'échanger avec vous et vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.

[Votre prénom et nom]
[Email] | [Téléphone]`,
  },
  {
    id: 'association',
    title: 'Association / ESS',
    subtitle: 'Économie sociale et solidaire',
    tip: 'Mettez en avant votre adhésion aux valeurs (solidarité, impact, utilité sociale) et, si pertinent, toute expérience bénévole ou engagement. Montrez que vous connaissez le projet associatif.',
    body: `Madame, Monsieur,

Étudiant(e) en [formation] et en recherche d'une alternance à partir de [date], je souhaite m'engager au sein d'une structure à impact. Votre association [nom] et sa mission [résumer la mission] résonnent particulièrement avec mes valeurs et mon projet professionnel.

Mon parcours ([formation], [expérience bénévole ou stage]) m'a sensibilisé(e) à [thématique]. Je souhaite mettre mes compétences en [domaine] au service de [objectif de l'association] et apprendre à vos côtés dans un cadre porteur de sens.

Je reste à votre disposition pour un échange et vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

[Votre prénom et nom]
[Email] | [Téléphone]`,
  },
  {
    id: 'public',
    title: 'Secteur public',
    subtitle: 'Collectivité, administration, établissement public',
    tip: 'Soulignez votre intérêt pour l’intérêt général, le service public et la régularité. Adaptez le vocabulaire (missions, usagers, cadre réglementaire) et mentionnez si vous connaissez la structure.',
    body: `Madame, Monsieur,

Étudiant(e) en [formation] et en recherche d'une alternance pour la période [dates], je me permets de vous adresser ma candidature pour rejoindre [service / direction] au sein de [collectivité ou administration].

Attaché(e) aux valeurs du service public et à [mission du service], je souhaite mettre à profit mes compétences acquises en [formation] et lors de [expérience] pour contribuer à [type de missions]. Je suis rigoureux(se), à l'écoute et souhaite apprendre dans un cadre au service des usagers et de l'intérêt général.

Je me tiens à votre disposition pour tout complément d'information et vous prie d'agréer, Madame, Monsieur, l'expression de ma considération distinguée.

[Votre prénom et nom]
[Email] | [Téléphone]`,
  },
  {
    id: 'cabinet',
    title: "Cabinet / Bureau d'études",
    subtitle: 'Conseil, expertise, études',
    tip: 'Montrez votre rigueur, votre capacité d’analyse et votre intérêt pour les missions projet. Les cabinets valorisent la qualité de rédaction et la structuration.',
    body: `Madame, Monsieur,

En [année] de [formation] et en recherche d'alternance à compter de [date], je suis très intéressé(e) par les missions de [type : conseil, études, expertise] que mène [nom du cabinet] et par votre approche [méthode ou domaine].

Mon parcours m'a permis de développer une capacité d'analyse, de synthèse et de [compétence métier]. Je souhaite rejoindre vos équipes pour participer à [type de missions] et renforcer mes compétences dans un environnement exigeant et formateur.

Je reste à votre disposition pour un entretien et vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

[Votre prénom et nom]
[Email] | [Téléphone]`,
  },
];

const ModelesLettres = () => {
  const [openId, setOpenId] = useState<TemplateId | null>('pme');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Modèle copié dans le presse-papier'),
      () => toast.error('Copie impossible')
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Modèles de lettres de motivation
        </h1>
        <p className="mt-2 text-gray-600">
          Choisissez un type d'entreprise et personnalisez le modèle avec vos informations. Copiez-collez puis adaptez les parties entre crochets [ ].
        </p>
      </div>

      <div className="space-y-4">
        {TEMPLATES.map((t) => (
          <div
            key={t.id}
            className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenId(openId === t.id ? null : t.id)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div>
                <span className="text-lg font-semibold text-gray-900">{t.title}</span>
                <span className="text-gray-500 text-sm ml-2">— {t.subtitle}</span>
              </div>
              <span className="text-gray-500">{openId === t.id ? '▼' : '▶'}</span>
            </button>
            {openId === t.id && (
              <div className="px-6 pb-6 pt-0 border-t border-gray-100">
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3 mt-4 mb-4">
                  💡 {t.tip}
                </p>
                <div className="relative">
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap font-sans overflow-x-auto">
                    {t.body}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy(t.body)}
                    className="absolute top-2 right-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium px-3 py-1.5 rounded"
                  >
                    Copier le modèle
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Remplacez les éléments entre [ ] par vos informations (formation, entreprise, compétences, dates, etc.).
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
        <p className="font-medium text-gray-900 mb-1">Conseil</p>
        <p>
          Personnalisez toujours la lettre : nom de l'entreprise, du recruteur si vous le connaissez, et une phrase sur ce qui vous attire chez eux. 
          Retrouvez plus de conseils dans l'onglet <Link to="/coaching" className="text-primary-600 font-medium hover:underline">Coaching</Link>.
        </p>
      </div>
    </div>
  );
};

export default ModelesLettres;
