/**
 * Informations légales — utilisées dans la Politique de confidentialité et les CGU.
 * policyVersion / termsVersion : les incrémenter seulement quand le changement
 * doit être relu à la connexion suivante.
 */
export const legalConfig = {
  /** Nom du responsable du traitement / éditeur */
  editorName: 'Jacques Philippe LOEMBA',
  /** Qualité / forme juridique */
  editorForm: 'Développeur Full Stack, en tant que particulier et auteur du site',
  /** Adresse (siège / localisation) */
  editorAddress: 'Île-de-France, France',
  /** Email de contact général */
  contactEmail: 'jacquesloemba@outlook.fr',
  /** Site web */
  contactWebsite: 'https://jacque004.github.io/jacques-website/',
  /** Profil LinkedIn */
  contactLinkedIn: 'https://www.linkedin.com/in/jacques-philippe-loemba',
  /** Hébergeur des pages du site */
  siteHostName: 'GitHub, Inc.',
  siteHostAddress: '88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis',
  siteUrl: 'https://jacque004.github.io/AlternanceTracker',
  /** Hébergeur des données */
  hostName: 'Supabase (Supabase Inc.)',
  hostAddress: '970 Toa Payoh North, #07-04, Singapore 318992',
  dataRegion: 'eu-west-3 (Paris, France)',
  /** Nom du service affiché */
  serviceName: 'AlternanceTracker',
  /** Date de dernière mise à jour des pages légales */
  lastLegalUpdate: '2026-10-20',
  policyVersion: '2026-10-20',
  termsVersion: '2026-10-20',
  minimumAge: 15,
  /** Mois sans ouverture de session avant suppression, après e-mail d’avertissement */
  inactivityMonths: 24,
  inactivityWarningDays: 30,
};

export type LegalConsent = {
  privacyPolicyAcceptedAt: string;
  termsAcceptedAt: string;
  privacyPolicyVersion: string;
  termsVersion: string;
  minimumAgeConfirmedAt: string;
};

export function buildLegalConsent(acceptedAt = new Date().toISOString()): LegalConsent {
  return {
    privacyPolicyAcceptedAt: acceptedAt,
    termsAcceptedAt: acceptedAt,
    privacyPolicyVersion: legalConfig.policyVersion,
    termsVersion: legalConfig.termsVersion,
    minimumAgeConfirmedAt: acceptedAt,
  };
}

/** Vrai seulement si les deux documents de la version en cours ont été confirmés. */
export function hasCurrentLegalAcceptance(
  user:
    | {
        privacyPolicyAcceptedAt?: string | null;
        termsAcceptedAt?: string | null;
        privacyPolicyVersion?: string | null;
        termsVersion?: string | null;
      }
    | null
    | undefined
): boolean {
  if (!user?.privacyPolicyAcceptedAt || !user.termsAcceptedAt) return false;
  return (
    user.privacyPolicyVersion === legalConfig.policyVersion &&
    user.termsVersion === legalConfig.termsVersion
  );
}

/** Sous-traitants qui reçoivent des données personnelles. */
export const legalProcessors = [
  {
    name: 'Supabase (Supabase Inc.)',
    role: 'Hébergement de la base, authentification, stockage de la photo de profil, envoi des e-mails de compte (confirmation, mot de passe).',
    place: 'Paris, France (région eu-west-3). La société est établie aux États-Unis et à Singapour.',
  },
  {
    name: 'GitHub, Inc.',
    role: 'Hébergement des pages du site. Les journaux techniques de cet hébergeur peuvent contenir l’adresse IP.',
    place: 'États-Unis.',
  },
  {
    name: 'Google',
    role: 'Connexion avec un compte Google. API Gemini, lorsqu’elle est utilisée, pour les textes demandés (CV, offre, lettre, entretien).',
    place: 'États-Unis et autres pays où Google traite les données de ses API.',
  },
  {
    name: 'OpenAI',
    role: 'Génération de textes, lorsque cette API est utilisée à la place de Gemini, à partir des extraits nécessaires à la demande.',
    place: 'États-Unis.',
  },
  {
    name: 'Resend',
    role: 'E-mails de rappel, résumé hebdomadaire et avertissement avant suppression d’un compte inactif, lorsque l’envoi est configuré.',
    place: 'États-Unis.',
  },
] as const;
