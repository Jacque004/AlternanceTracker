import { supabase } from '../lib/supabase';
import { Application, ApplicationListParams, ApplicationsResult, DashboardStatistics, UserCV, CVContent, GeneratedLetter, CVAnalysis } from '../types';

function mapRowToApplication(row: any): Application {
  return {
    id: row.id,
    companyName: row.company_name,
    position: row.position,
    status: row.status,
    applicationDate: row.application_date,
    responseDate: row.response_date,
    notes: row.notes,
    location: row.location,
    salaryRange: row.salary_range,
    jobUrl: row.job_url,
    interviewDate: row.interview_date,
    interviewTime: row.interview_time,
    interviewPlace: row.interview_place,
    lastRelanceAt: row.last_relance_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Fonction helper pour s'assurer que le profil utilisateur existe
// Utilise une fonction SQL avec SECURITY DEFINER pour contourner RLS
const ensureUserProfile = async (_userId: string, _email: string): Promise<void> => {
  // Appeler la fonction SQL qui contourne RLS
  const { error } = await supabase.rpc('ensure_user_profile');

  if (error) {
    console.error('Erreur lors de la création du profil utilisateur:', error);
    // Si l'erreur est "duplicate key" ou "already exists", ignorer
    if (error.code !== '23505' && !error.message.includes('already exists')) {
      throw new Error(`Impossible de créer le profil utilisateur: ${error.message}`);
    }
  }
};

export const applicationService = {
  getAll: async (params?: ApplicationListParams | string): Promise<ApplicationsResult> => {
    const p: ApplicationListParams | undefined =
      typeof params === 'string' ? { status: params || undefined } : params;

    const page = p?.page ?? 1;
    const pageSize = p?.pageSize ?? 0;
    const usePagination = pageSize > 0;

    let query = supabase.from('applications').select(usePagination ? '*' : '*', { count: usePagination ? 'exact' : undefined });

    if (p?.status) query = query.eq('status', p.status);

    if (p?.search && p.search.trim()) {
      const safe = p.search.trim().replace(/,/g, ' ').replace(/\*/g, '');
      const term = `*${safe}*`;
      query = query.or(
        `company_name.ilike.${term},position.ilike.${term},notes.ilike.${term}`
      );
    }
    if (p?.dateFrom) query = query.gte('application_date', p.dateFrom);
    if (p?.dateTo) query = query.lte('application_date', p.dateTo);

    const sortBy = p?.sortBy || 'created_at';
    const sortCol =
      sortBy === 'company_name'
        ? 'company_name'
        : sortBy === 'application_date'
          ? 'application_date'
          : sortBy === 'status'
            ? 'status'
            : 'created_at';
    const ascending = p?.sortOrder === 'asc';
    query = query.order(sortCol, { ascending, nullsFirst: false });

    if (usePagination) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    const list = (data || []).map(mapRowToApplication);
    const total = usePagination ? (count ?? list.length) : list.length;
    return { data: list, total };
  },

  getById: async (id: number): Promise<Application> => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return mapRowToApplication(data);
  },

  create: async (data: Partial<Application>): Promise<Application> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Vérifier et créer le profil utilisateur si nécessaire
    await ensureUserProfile(user.id, user.email ?? '');

    const { data: result, error } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        company_name: data.companyName,
        position: data.position,
        status: data.status || 'pending',
        application_date: data.applicationDate || null,
        response_date: data.responseDate || null,
        notes: data.notes || null,
        location: data.location || null,
        salary_range: data.salaryRange || null,
        job_url: data.jobUrl || null,
        interview_date: data.interviewDate || null,
        interview_time: data.interviewTime || null,
        interview_place: data.interviewPlace || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création de la candidature:', error);
      throw new Error(error.message || 'Erreur lors de la création de la candidature');
    }

    return mapRowToApplication(result);
  },

  update: async (id: number, data: Partial<Application>): Promise<Application> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Vérifier et créer le profil utilisateur si nécessaire
    await ensureUserProfile(user.id, user.email ?? '');

    const updates: any = {};
    if (data.companyName !== undefined) updates.company_name = data.companyName;
    if (data.position !== undefined) updates.position = data.position;
    if (data.status !== undefined) updates.status = data.status;
    if (data.applicationDate !== undefined) updates.application_date = data.applicationDate;
    if (data.responseDate !== undefined) updates.response_date = data.responseDate;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.location !== undefined) updates.location = data.location;
    if (data.salaryRange !== undefined) updates.salary_range = data.salaryRange;
    if (data.jobUrl !== undefined) updates.job_url = data.jobUrl;
    if (data.interviewDate !== undefined) updates.interview_date = data.interviewDate || null;
    if (data.interviewTime !== undefined) updates.interview_time = data.interviewTime || null;
    if (data.interviewPlace !== undefined) updates.interview_place = data.interviewPlace || null;

    const { data: result, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Vérifier que la candidature appartient à l'utilisateur
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la mise à jour:', error);
      throw new Error(error.message || 'Erreur lors de la mise à jour de la candidature');
    }

    if (!result) {
      throw new Error('Candidature non trouvée ou vous n\'avez pas les permissions');
    }

    return mapRowToApplication(result);
  },

  /** Marquer une candidature comme relancée (met à jour last_relance_at) */
  markRelance: async (id: number): Promise<Application> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { data: result, error } = await supabase
      .from('applications')
      .update({ last_relance_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message || 'Erreur lors de la mise à jour');
    if (!result) throw new Error('Candidature non trouvée');
    return mapRowToApplication(result);
  },

  delete: async (id: number): Promise<void> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Vérifier que la candidature appartient à l'utilisateur
    
    if (error) {
      console.error('Erreur lors de la suppression:', error);
      throw new Error(error.message || 'Erreur lors de la suppression de la candidature');
    }
  },
};

export const dashboardService = {
  getStatistics: async (): Promise<DashboardStatistics> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Total
    const { count: total } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Par statut
    const { data: statusData } = await supabase
      .from('applications')
      .select('status')
      .eq('user_id', user.id);

    const statusDistribution: any = {};
    statusData?.forEach((row) => {
      statusDistribution[row.status] = (statusDistribution[row.status] || 0) + 1;
    });

    // Par mois
    const { data: monthlyData } = await supabase
      .from('applications')
      .select('application_date')
      .eq('user_id', user.id)
      .not('application_date', 'is', null);

    const monthlyMap: Record<string, number> = {};
    monthlyData?.forEach((row) => {
      if (row.application_date) {
        const month = new Date(row.application_date).toISOString().substring(0, 7);
        monthlyMap[month] = (monthlyMap[month] || 0) + 1;
      }
    });

    const monthly = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }));

    /** Nombre de candidatures cette semaine (pour objectif) */
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    const weekStart = startOfWeek.toISOString().slice(0, 10);
    const { count: applicationsThisWeek } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', weekStart);

    // Taux de réponse
    const { count: responded } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('response_date', 'is', null);

    const responseRate = total && total > 0 ? ((responded || 0) / total) * 100 : 0;

    return {
      total: total || 0,
      statusDistribution,
      monthlyData: monthly,
      responseRate: Math.round(responseRate * 100) / 100,
      responded: responded || 0,
      pending: statusDistribution.pending || 0,
      interview: statusDistribution.interview || 0,
      accepted: statusDistribution.accepted || 0,
      rejected: statusDistribution.rejected || 0,
      applicationsThisWeek: applicationsThisWeek ?? 0,
    };
  },

  getRecent: async (limit: number = 5): Promise<Application[]> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(mapRowToApplication);
  },

  /** Candidatures avec entretien à venir (pour rappels) */
  getUpcomingInterviews: async (limit: number = 20): Promise<Application[]> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'interview')
      .not('interview_date', 'is', null)
      .gte('interview_date', today)
      .order('interview_date', { ascending: true })
      .order('interview_time', { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(mapRowToApplication);
  },
};

export const aiService = {
  generateCoverLetter: async (data: {
    companyName: string;
    position: string;
    userInfo?: string;
    additionalContext?: string;
  }): Promise<string> => {
    const { data: result, error } = await supabase.functions.invoke('generate-cover-letter', {
      body: data,
    });

    if (error) throw error;
    return result.coverLetter;
  },

  /** Analyse le CV et retourne des conseils ciblés pour une recherche d'alternance (backend si VITE_API_URL, sinon Supabase) */
  analyzeCVForAlternance: async (cvText: string): Promise<string> => {
    const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    if (apiUrl) {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${apiUrl}/ai/analyze-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ cvText: cvText.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.message || data?.error || res.statusText || `Erreur ${res.status}`;
        throw new Error(message);
      }
      return data?.advice ?? '';
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuration manquante : définissez VITE_API_URL (backend) ou VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (Supabase).');
    }
    if (!supabaseAnonKey.startsWith('eyJ')) {
      throw new Error('Clé Supabase invalide. Dans le Dashboard Supabase → Project Settings → API, copiez la clé "anon" "public" (elle commence par eyJ).');
    }

    const url = `${supabaseUrl}/functions/v1/analyze-cv-alternance`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ cvText: cvText.trim() }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = body?.error || body?.message || res.statusText || `Erreur ${res.status}`;
      throw new Error(message);
    }

    if (body?.error) throw new Error(body.error);
    return body?.advice ?? '';
  },

  /** Analyse le CV pour la compatibilité ATS (score + conseils). Nécessite VITE_API_URL (backend). */
  analyzeCVForATS: async (cvText: string): Promise<{ score: number; tips: string[]; suggestedKeywords: string[] }> => {
    const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    if (!apiUrl) {
      throw new Error('L\'analyse ATS est disponible avec le backend (VITE_API_URL).');
    }
    let token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token ?? null;
    }
    const res = await fetch(`${apiUrl}/ai/analyze-cv-ats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ cvText: cvText.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.message || data?.error || res.statusText || `Erreur ${res.status}`;
      throw new Error(message);
    }
    return {
      score: Math.min(100, Math.max(0, Number(data?.score) ?? 0)),
      tips: Array.isArray(data?.tips) ? data.tips : [],
      suggestedKeywords: Array.isArray(data?.suggestedKeywords) ? data.suggestedKeywords : [],
    };
  },

  /** Analyse une offre d'emploi (URL ou texte) et retourne des conseils pour candidater */
  analyzeJobOffer: async (params: {
    jobOfferUrl?: string;
    offerText?: string;
    focusResume?: boolean;
    focusCV?: boolean;
    focusLettre?: boolean;
    focusEntretien?: boolean;
  }): Promise<string> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuration Supabase manquante (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
    }
    const url = `${supabaseUrl}/functions/v1/analyze-job-offer`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        jobOfferUrl: params.jobOfferUrl?.trim() || undefined,
        offerText: params.offerText?.trim() || undefined,
        focusResume: params.focusResume,
        focusCV: params.focusCV,
        focusLettre: params.focusLettre,
        focusEntretien: params.focusEntretien,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = body?.error || body?.message || res.statusText || `Erreur ${res.status}`;
      throw new Error(message);
    }
    if (body?.error) throw new Error(body.error);
    return body?.advice ?? '';
  },
};

function mapRowToUserCV(row: any): UserCV {
  return {
    id: row.id,
    title: row.title || 'Mon CV',
    content: (row.content as CVContent) || {},
    atsScore: row.ats_score ?? null,
    atsAnalyzedAt: row.ats_analyzed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const cvService = {
  getAll: async (): Promise<UserCV[]> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await supabase
      .from('user_cvs')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRowToUserCV);
  },

  getById: async (id: string): Promise<UserCV> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await supabase
      .from('user_cvs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (error) throw error;
    return mapRowToUserCV(data);
  },

  getOrCreateDefault: async (): Promise<UserCV> => {
    const list = await cvService.getAll();
    if (list.length > 0) return list[0];
    return cvService.create({ title: 'Mon CV', content: {} });
  },

  create: async (payload: { title: string; content: CVContent }): Promise<UserCV> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await supabase
      .from('user_cvs')
      .insert({
        user_id: user.id,
        title: payload.title,
        content: payload.content,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRowToUserCV(data);
  },

  update: async (
    id: string,
    payload: { title?: string; content?: CVContent; atsScore?: number | null }
  ): Promise<UserCV> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const updatePayload: any = {};
    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.content !== undefined) updatePayload.content = payload.content;
    if (payload.atsScore !== undefined) {
      updatePayload.ats_score = payload.atsScore;
      updatePayload.ats_analyzed_at = payload.atsScore != null ? new Date().toISOString() : null;
    }
    const { data, error } = await supabase
      .from('user_cvs')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw error;
    return mapRowToUserCV(data);
  },

  delete: async (id: string): Promise<void> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { error } = await supabase.from('user_cvs').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
  },
};

function mapRowToGeneratedLetter(row: any): GeneratedLetter {
  return {
    id: row.id,
    title: row.title || 'Lettre de motivation',
    content: row.content,
    companyName: row.company_name ?? null,
    position: row.position ?? null,
    applicationId: row.application_id ?? null,
    createdAt: row.created_at,
  };
}

export const letterService = {
  getAll: async (): Promise<GeneratedLetter[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await supabase
      .from('generated_letters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRowToGeneratedLetter);
  },

  create: async (payload: { title: string; content: string; companyName?: string; position?: string; applicationId?: number }): Promise<GeneratedLetter> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await supabase
      .from('generated_letters')
      .insert({
        user_id: user.id,
        title: payload.title,
        content: payload.content,
        company_name: payload.companyName ?? null,
        position: payload.position ?? null,
        application_id: payload.applicationId ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRowToGeneratedLetter(data);
  },

  delete: async (id: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { error } = await supabase.from('generated_letters').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
  },
};

function mapRowToCVAnalysis(row: any): CVAnalysis {
  return {
    id: row.id,
    type: row.type,
    resultText: row.result_text ?? null,
    resultJson: row.result_json ?? null,
    createdAt: row.created_at,
  };
}

export const cvAnalysisService = {
  getAll: async (limit: number = 20): Promise<CVAnalysis[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await supabase
      .from('cv_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(mapRowToCVAnalysis);
  },

  create: async (payload: { type: 'alternance' | 'ats'; resultText?: string; resultJson?: Record<string, unknown>; userCvId?: string }): Promise<CVAnalysis> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await supabase
      .from('cv_analyses')
      .insert({
        user_id: user.id,
        user_cv_id: payload.userCvId ?? null,
        type: payload.type,
        result_text: payload.resultText ?? null,
        result_json: payload.resultJson ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRowToCVAnalysis(data);
  },
};

/** RGPD : export et suppression du compte */
export const rgpdService = {
  /** Droit à la portabilité — export de toutes les données personnelles */
  exportMyData: async (): Promise<Record<string, unknown>> => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Non authentifié');

    const [profileRes, applicationsRes, cvsRes, lettersRes, analysesRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', authUser.id).single(),
      supabase.from('applications').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }),
      supabase.from('user_cvs').select('*').eq('user_id', authUser.id),
      supabase.from('generated_letters').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }),
      supabase.from('cv_analyses').select('id, type, result_text, result_json, created_at').eq('user_id', authUser.id).order('created_at', { ascending: false }),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (applicationsRes.error) throw applicationsRes.error;
    if (cvsRes.error) throw cvsRes.error;
    if (lettersRes.error) throw lettersRes.error;
    if (analysesRes.error) throw analysesRes.error;

    return {
      exportDate: new Date().toISOString(),
      purpose: 'Export des données personnelles (RGPD - droit à la portabilité)',
      profile: profileRes.data ?? null,
      applications: applicationsRes.data ?? [],
      cvs: cvsRes.data ?? [],
      generatedLetters: lettersRes.data ?? [],
      cvAnalyses: analysesRes.data ?? [],
    };
  },

  /** Droit à l'effacement — suppression du compte et de toutes les données (Edge Function) */
  deleteMyAccount: async (): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Non authentifié');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuration Supabase manquante');
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((body as { error?: string }).error || 'Impossible de supprimer le compte');
    }
  },
};

