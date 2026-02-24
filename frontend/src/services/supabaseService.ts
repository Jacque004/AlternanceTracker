import { supabase } from '../lib/supabase';
import { Application, DashboardStatistics } from '../types';

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
  getAll: async (status?: string): Promise<Application[]> => {
    let query = supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  getById: async (id: number): Promise<Application> => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    const row = data;
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
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
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création de la candidature:', error);
      throw new Error(error.message || 'Erreur lors de la création de la candidature');
    }

    const row = result;
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
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

    const row = result;
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
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

    return (data || []).map((row: any) => ({
      id: row.id,
      companyName: row.company_name,
      position: row.position,
      status: row.status,
      applicationDate: row.application_date,
      createdAt: row.created_at,
    }));
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

  /** Analyse le CV et retourne des conseils ciblés pour une recherche d'alternance */
  analyzeCVForAlternance: async (cvText: string): Promise<string> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuration Supabase manquante (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
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

