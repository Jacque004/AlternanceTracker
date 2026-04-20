export interface User {
  id: number | string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt?: string;
  school?: string;
  formation?: string;
  studyYear?: string;
  alternanceRhythm?: string;
  desiredStartDate?: string;
  linkedinUrl?: string;
  /** Recevoir un résumé hebdo par email (actif si cron + Edge Function configurés) */
  weeklySummaryEnabled?: boolean;
  /** Recevoir les rappels (relances, entretiens) par email */
  reminderEmailsEnabled?: boolean;
  /** Objectif de candidatures par semaine (affiché sur le dashboard) */
  applicationsGoal?: number | null;
  /** RGPD : date d'acceptation de la politique de confidentialité */
  privacyPolicyAcceptedAt?: string | null;
  /** RGPD : date d'acceptation des CGU */
  termsAcceptedAt?: string | null;
  /** RGPD : consentement aux emails marketing */
  marketingEmailsConsent?: boolean;
}

export interface Application {
  id: number;
  companyName: string;
  position: string;
  status: 'pending' | 'interview' | 'accepted' | 'rejected';
  applicationDate?: string;
  responseDate?: string;
  notes?: string;
  location?: string;
  salaryRange?: string;
  jobUrl?: string;
  /** Date d'entretien (statut Entretien) */
  interviewDate?: string;
  /** Heure d'entretien (optionnel) */
  interviewTime?: string;
  /** Lieu d'entretien (optionnel) */
  interviewPlace?: string;
  /** Date de dernière relance (pour exclure des rappels) */
  lastRelanceAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Métadonnées extraites d’une page d’offre (Edge Function fetch-job-metadata) */
export interface JobMetadataFromUrl {
  companyName: string | null;
  position: string | null;
  descriptionSnippet: string | null;
  pageTitle: string | null;
  jobUrl: string;
}

/** Options de filtre/recherche/tri pour la liste des candidatures */
export interface ApplicationListParams {
  status?: string;
  search?: string;
  sortBy?: 'application_date' | 'created_at' | 'company_name' | 'status';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

/** Résultat paginé des candidatures */
export interface ApplicationsResult {
  data: Application[];
  total: number;
}

export interface DashboardStatistics {
  total: number;
  statusDistribution: {
    pending?: number;
    interview?: number;
    accepted?: number;
    rejected?: number;
  };
  monthlyData: Array<{
    month: string;
    count: number;
  }>;
  responseRate: number;
  responded: number;
  pending: number;
  interview: number;
  accepted: number;
  rejected: number;
  /** Candidatures créées cette semaine (pour objectif) */
  applicationsThisWeek?: number;
}

/** Sections standard pour un CV compatible ATS (titres reconnus par les logiciels de tri) */
export type CVSectionKey =
  | 'coordonnees'
  | 'titre_profil'
  | 'experience'
  | 'formation'
  | 'competences'
  | 'langues'
  | 'centres_interet';

export interface CVContent {
  coordonnees?: string;
  /** Champs structurés pour afficher/mettre en forme les coordonnées */
  coord_prenom?: string;
  coord_nom?: string;
  coord_email?: string;
  coord_telephone?: string;
  coord_adresse?: string;
  coord_ville?: string;
  coord_linkedin?: string;
  titre_profil?: string;
  experience?: string;
  formation?: string;
  competences?: string;
  langues?: string;
  centres_interet?: string;
}

export interface UserCV {
  id: string;
  title: string;
  content: CVContent;
  atsScore?: number | null;
  atsAnalyzedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Résultat d’une analyse ATS */
export interface ATSAnalysisResult {
  score: number;
  tips: string[];
  suggestedKeywords?: string[];
}

export interface GeneratedLetter {
  id: string;
  title: string;
  content: string;
  companyName?: string | null;
  position?: string | null;
  applicationId?: number | null;
  createdAt?: string;
}

export interface CVAnalysis {
  id: string;
  type: 'alternance' | 'ats';
  resultText?: string | null;
  resultJson?: Record<string, unknown> | null;
  createdAt?: string;
}

