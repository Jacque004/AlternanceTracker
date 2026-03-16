import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { aiService, letterService } from '../services/supabaseService';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import type { GeneratedLetter } from '../types';

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
  const [searchParams] = useSearchParams();
  const { user } = useSupabaseAuth();
  const [openId, setOpenId] = useState<TemplateId | null>('pme');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [savingLetterId, setSavingLetterId] = useState<string | null>(null);
  const [savedLetters, setSavedLetters] = useState<GeneratedLetter[]>([]);
  const [lettersLoading, setLettersLoading] = useState(true);

  useEffect(() => {
    const c = searchParams.get('company') || '';
    const p = searchParams.get('position') || '';
    setCompany(c);
    setPosition(p);
  }, [searchParams]);

  useEffect(() => {
    letterService.getAll().then(setSavedLetters).catch(() => setSavedLetters([])).finally(() => setLettersLoading(false));
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Modèle copié dans le presse-papier'),
      () => toast.error('Copie impossible')
    );
  };

  const userInfo = user ? [user.formation, user.school, user.studyYear].filter(Boolean).join(', ') : '';
  const handleGenerate = async () => {
    if (!company.trim() || !position.trim()) {
      toast.error('Entreprise et poste sont requis');
      return;
    }
    setGenerating(true);
    setGeneratedLetter('');
    try {
      const letter = await aiService.generateCoverLetter({
        companyName: company.trim(),
        position: position.trim(),
        userInfo: userInfo || undefined,
        additionalContext: additionalContext.trim() || undefined,
      });
      setGeneratedLetter(letter);
      toast.success('Lettre générée');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveLetter = async () => {
    if (!generatedLetter.trim()) return;
    setSavingLetterId('new');
    try {
      await letterService.create({
        title: `Lettre ${company || 'sans entreprise'} – ${position || ''}`.trim(),
        content: generatedLetter,
        companyName: company.trim() || undefined,
        position: position.trim() || undefined,
      });
      refreshLetters();
      toast.success('Lettre enregistrée');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    } finally {
      setSavingLetterId(null);
    }
  };

  const refreshLetters = () => {
    letterService.getAll().then(setSavedLetters).catch(() => {});
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Modèles de lettres de motivation
        </h1>
        <p className="mt-2 text-gray-600">
          Choisissez un type d'entreprise et personnalisez le modèle avec vos informations. Vous pouvez aussi générer une lettre avec l'IA à partir d'une candidature.
        </p>
      </div>

      {/* Générer avec l'IA */}
      <div className="bg-white shadow-card rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Générer une lettre avec l'IA</h2>
        <p className="text-sm text-gray-600 mb-4">
          Entreprise et poste peuvent être pré-remplis si vous venez depuis une candidature.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Nom de l'entreprise"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Poste</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Intitulé du poste"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Contexte supplémentaire (optionnel)</label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            rows={2}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="Points à mettre en avant, secteur..."
          />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !company.trim() || !position.trim()}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
        >
          {generating ? 'Génération...' : 'Générer la lettre'}
        </button>
        {generatedLetter && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="relative">
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap font-sans overflow-x-auto max-h-96 overflow-y-auto">
                {generatedLetter}
              </pre>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => handleCopy(generatedLetter)} className="text-sm font-medium text-primary-600 hover:underline">
                  Copier
                </button>
                <button type="button" onClick={handleSaveLetter} disabled={savingLetterId !== null} className="text-sm font-medium text-primary-600 hover:underline disabled:opacity-50">
                  {savingLetterId ? 'Enregistrement...' : 'Enregistrer cette lettre'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mes lettres enregistrées */}
      <div className="bg-white shadow-card rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mes lettres enregistrées</h2>
        {lettersLoading ? (
          <p className="text-sm text-gray-500">Chargement...</p>
        ) : savedLetters.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune lettre enregistrée. Générez une lettre ci-dessus puis cliquez sur « Enregistrer ».</p>
        ) : (
          <ul className="space-y-2">
            {savedLetters.map((letter) => (
              <li key={letter.id} className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{letter.title || 'Sans titre'}</p>
                  {(letter.companyName || letter.position) && (
                    <p className="text-xs text-gray-500">{letter.companyName} – {letter.position}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => handleCopy(letter.content)} className="text-sm text-primary-600 hover:underline">Copier</button>
                  {letter.id && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await letterService.delete(letter.id!);
                          refreshLetters();
                          toast.success('Lettre supprimée');
                        } catch {
                          toast.error('Erreur');
                        }
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4">
        {TEMPLATES.map((t) => (
          <div
            key={t.id}
            className="bg-white shadow-card rounded-xl border border-gray-200 overflow-hidden"
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
          Retrouvez plus de conseils dans l'onglet <Link to="/preparer/conseils" className="text-primary-600 font-medium hover:underline">Conseils</Link>.
        </p>
      </div>
    </div>
  );
};

export default ModelesLettres;
