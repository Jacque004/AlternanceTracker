import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User as AppUser } from '../types';

interface SupabaseAuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    school?: string;
    formation?: string;
    studyYear?: string;
    alternanceRhythm?: string;
    desiredStartDate?: string;
    linkedinUrl?: string;
    weeklySummaryEnabled?: boolean;
    reminderEmailsEnabled?: boolean;
    applicationsGoal?: number | null;
  }) => Promise<{ error: any }>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export const SupabaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer la session actuelle
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Erreur lors de la récupération de la session:', error);
        setLoading(false);
        return;
      }
      
      // Vérifier si la session est expirée
      if (session && session.expires_at) {
        const expiresAt = session.expires_at * 1000; // Convertir en millisecondes
        const now = Date.now();
        
        if (now >= expiresAt) {
          // Session expirée, déconnecter l'utilisateur
          console.log('Session expirée, déconnexion...');
          supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
      }
      
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Gérer l'expiration du token
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token rafraîchi avec succès');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
      }
      
      // Vérifier si la session est expirée
      if (session && session.expires_at) {
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        
        if (now >= expiresAt) {
          supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
      }
      
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser: User) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, created_at, school, formation, study_year, alternance_rhythm, desired_start_date, linkedin_url, weekly_summary_enabled, reminder_emails_enabled, applications_goal')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      if (data) {
        setUser({
          id: data.id,
          email: data.email,
          firstName: data.first_name,
          lastName: data.last_name,
          createdAt: data.created_at,
          school: data.school,
          formation: data.formation,
          studyYear: data.study_year,
          alternanceRhythm: data.alternance_rhythm,
          desiredStartDate: data.desired_start_date,
          linkedinUrl: data.linkedin_url,
          weeklySummaryEnabled: data.weekly_summary_enabled ?? false,
          reminderEmailsEnabled: data.reminder_emails_enabled ?? true,
          applicationsGoal: data.applications_goal ?? null,
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
        emailRedirectTo: (() => {
          const base = (import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin + (import.meta.env.BASE_URL || '') : '')).replace(/\/$/, '');
          return base ? `${base}/login?confirmed=1` : undefined;
        })(),
      },
    });

    // Le profil utilisateur est créé automatiquement par le trigger PostgreSQL
    // Pas besoin de l'insérer manuellement
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updateProfile = async (data: {
    firstName?: string;
    lastName?: string;
    school?: string;
    formation?: string;
    studyYear?: string;
    alternanceRhythm?: string;
    desiredStartDate?: string;
    linkedinUrl?: string;
    weeklySummaryEnabled?: boolean;
    reminderEmailsEnabled?: boolean;
  }) => {
    if (!session?.user) return { error: new Error('No user session') };

    const updates: any = {};
    if (data.firstName !== undefined) updates.first_name = data.firstName;
    if (data.lastName !== undefined) updates.last_name = data.lastName;
    if (data.school !== undefined) updates.school = data.school;
    if (data.formation !== undefined) updates.formation = data.formation;
    if (data.studyYear !== undefined) updates.study_year = data.studyYear;
    if (data.alternanceRhythm !== undefined) updates.alternance_rhythm = data.alternanceRhythm;
    if (data.desiredStartDate !== undefined) updates.desired_start_date = data.desiredStartDate || null;
    if (data.linkedinUrl !== undefined) updates.linkedin_url = data.linkedinUrl;
    if (data.weeklySummaryEnabled !== undefined) updates.weekly_summary_enabled = data.weeklySummaryEnabled;
    if (data.reminderEmailsEnabled !== undefined) updates.reminder_emails_enabled = data.reminderEmailsEnabled;
    if (data.applicationsGoal !== undefined) updates.applications_goal = data.applicationsGoal === null || data.applicationsGoal === 0 ? null : data.applicationsGoal;

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', session.user.id);

    if (!error) {
      await loadUserProfile(session.user);
    }

    return { error };
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};

