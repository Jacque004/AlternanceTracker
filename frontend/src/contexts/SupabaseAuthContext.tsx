import { useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { SupabaseAuthReactContext } from './authContext';
import { isInvalidRefreshTokenError, supabase } from '../lib/supabase';
import { User as AppUser } from '../types';
import { normalizeSupabaseAvatarPublicUrl } from '../utils/supabaseStorageUrl';
import { isSupabaseSchemaError } from '../utils/supabaseSchema';
import {
  isInAppNotificationsColumnMissing,
  markInAppNotificationsColumnMissing,
  markInAppNotificationsColumnPresent,
} from '../utils/inAppNotificationsSchema';
import { getAppBaseUrl } from '../utils/appUrl';
import { getOAuthAvatarUrl, getOAuthFirstName, getOAuthLastName } from '../utils/oauthUserMetadata';

const OAUTH_CONSENT_STORAGE_KEY = 'alternancetracker_oauth_consent';

const USER_PROFILE_SELECT =
  'id, email, first_name, last_name, created_at, school, formation, study_year, alternance_rhythm, desired_start_date, linkedin_url, avatar_url, weekly_summary_enabled, reminder_emails_enabled, applications_goal, privacy_policy_accepted_at, terms_accepted_at, marketing_emails_consent';

export const SupabaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clearLocalSession = async () => {
      await supabase.auth.signOut({ scope: 'local' });
      setSession(null);
      setUser(null);
      setLoading(false);
    };

    // Récupérer la session actuelle
    void (async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Erreur lors de la récupération de la session:', error);
        if (isInvalidRefreshTokenError(error)) {
          await clearLocalSession();
          return;
        }
        setLoading(false);
        return;
      }

      // Access token expiré : tenter un refresh avant de déconnecter
      if (session?.expires_at && session.expires_at * 1000 <= Date.now()) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session) {
          if (refreshError && isInvalidRefreshTokenError(refreshError)) {
            console.warn('Refresh token invalide, session locale effacée.');
          } else {
            console.log('Session expirée, déconnexion...');
          }
          await clearLocalSession();
          return;
        }
        setSession(refreshed.session);
        if (refreshed.session.user) {
          await loadUserProfile(refreshed.session.user);
        } else {
          setLoading(false);
        }
        return;
      }

      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    })();

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token rafraîchi avec succès');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
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

  const applyPendingOAuthConsent = async (userId: string): Promise<boolean> => {
    const raw = sessionStorage.getItem(OAUTH_CONSENT_STORAGE_KEY);
    if (!raw) return false;

    sessionStorage.removeItem(OAUTH_CONSENT_STORAGE_KEY);

    try {
      const consent = JSON.parse(raw) as {
        privacyPolicyAcceptedAt?: string;
        termsAcceptedAt?: string;
      };

      if (consent.privacyPolicyAcceptedAt && consent.termsAcceptedAt) {
        const { error } = await supabase
          .from('users')
          .update({
            privacy_policy_accepted_at: consent.privacyPolicyAcceptedAt,
            terms_accepted_at: consent.termsAcceptedAt,
          })
          .eq('id', userId);

        return !error;
      }
    } catch {
      // sessionStorage invalide, on ignore
    }

    return false;
  };

  const loadUserProfile = async (authUser: User) => {
    try {
      // Garantit que la ligne dans `public.users` existe (fonction SECURITY DEFINER)
      // pour que le tutoriel onboarding puisse s'afficher immédiatement après inscription.
      try {
        const { error: rpcError } = await supabase.rpc('ensure_user_profile');
        if (rpcError) {
          // N'empêche pas la suite (la ligne peut déjà exister).
          console.warn('ensure_user_profile a renvoyé une erreur :', rpcError);
        }
      } catch (e) {
        // ignore, on retentera via le fallback ci-dessous
        console.warn('ensure_user_profile a échoué :', e);
      }

      await applyPendingOAuthConsent(authUser.id);

      const profileQuery = await supabase
        .from('users')
        .select(USER_PROFILE_SELECT)
        .eq('id', authUser.id)
        .single();

      const profileRow: Record<string, unknown> | null = profileQuery.data;
      const error = profileQuery.error;

      if (error || !profileRow) {
        // Fallback: au minimum on considère l'utilisateur connecté.
        // Cela évite de bloquer l'affichage onboarding si la ligne `users` n'est pas encore prête.
        const meta = authUser.user_metadata ?? {};
        setUser({
          id: authUser.id,
          email: authUser.email ?? '',
          firstName: getOAuthFirstName(meta),
          lastName: getOAuthLastName(meta),
          createdAt: undefined,
          school: undefined,
          formation: undefined,
          studyYear: undefined,
          alternanceRhythm: undefined,
          desiredStartDate: undefined,
          linkedinUrl: undefined,
          weeklySummaryEnabled: false,
          reminderEmailsEnabled: true,
          inAppNotificationsEnabled: true,
          applicationsGoal: null,
          privacyPolicyAcceptedAt: undefined,
          termsAcceptedAt: undefined,
          marketingEmailsConsent: false,
          isAdmin: false,
          avatarUrl: getOAuthAvatarUrl(meta),
        });
        return;
      }

      const appUser: AppUser = {
        id: profileRow.id as string,
        email: profileRow.email as string,
        firstName: profileRow.first_name as string,
        lastName: profileRow.last_name as string,
        createdAt: profileRow.created_at as string | undefined,
        school: profileRow.school as string | undefined,
        formation: profileRow.formation as string | undefined,
        studyYear: profileRow.study_year as string | undefined,
        alternanceRhythm: profileRow.alternance_rhythm as string | undefined,
        desiredStartDate: profileRow.desired_start_date as string | undefined,
        linkedinUrl: profileRow.linkedin_url as string | undefined,
        avatarUrl: normalizeSupabaseAvatarPublicUrl((profileRow.avatar_url as string | null) ?? null),
        weeklySummaryEnabled: (profileRow.weekly_summary_enabled as boolean | null) ?? false,
        reminderEmailsEnabled: (profileRow.reminder_emails_enabled as boolean | null) ?? true,
        inAppNotificationsEnabled: true,
        applicationsGoal: (profileRow.applications_goal as number | null) ?? null,
        privacyPolicyAcceptedAt: (profileRow.privacy_policy_accepted_at as string | null) ?? undefined,
        termsAcceptedAt: (profileRow.terms_accepted_at as string | null) ?? undefined,
        marketingEmailsConsent: (profileRow.marketing_emails_consent as boolean | null) ?? false,
        isAdmin: false,
      };

      try {
        const { data: adminFlag, error: adminError } = await supabase.rpc('is_admin');
        if (!adminError && adminFlag === true) {
          appUser.isAdmin = true;
        }
      } catch {
        // migration 021 non appliquée ou RPC indisponible
      }

      setUser(appUser);

      if (!isInAppNotificationsColumnMissing()) {
        void supabase
          .from('users')
          .select('in_app_notifications_enabled')
          .eq('id', authUser.id)
          .single()
          .then(({ data, error: inAppError }) => {
            if (inAppError) {
              if (isSupabaseSchemaError(inAppError)) {
                markInAppNotificationsColumnMissing();
              }
              return;
            }
            markInAppNotificationsColumnPresent();
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    inAppNotificationsEnabled: (data?.in_app_notifications_enabled as boolean | null) ?? true,
                  }
                : prev
            );
          });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);

      // Si tout échoue, au moins on évite un `user=null` définitif.
      const meta = authUser.user_metadata ?? {};
      setUser({
        id: authUser.id,
        email: authUser.email ?? '',
        firstName: getOAuthFirstName(meta),
        lastName: getOAuthLastName(meta),
        createdAt: undefined,
        school: undefined,
        formation: undefined,
        studyYear: undefined,
        alternanceRhythm: undefined,
        desiredStartDate: undefined,
        linkedinUrl: undefined,
        weeklySummaryEnabled: false,
        reminderEmailsEnabled: true,
        inAppNotificationsEnabled: true,
        applicationsGoal: null,
        privacyPolicyAcceptedAt: undefined,
        termsAcceptedAt: undefined,
        marketingEmailsConsent: false,
        isAdmin: false,
        avatarUrl: getOAuthAvatarUrl(meta),
      });
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    consent?: { privacyPolicyAcceptedAt: string; termsAcceptedAt: string }
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          ...(consent && {
            privacy_policy_accepted_at: consent.privacyPolicyAcceptedAt,
            terms_accepted_at: consent.termsAcceptedAt,
          }),
        },
        emailRedirectTo: (() => {
          const base = getAppBaseUrl();
          return base ? `${base}/login?confirmed=1` : undefined;
        })(),
      },
    });

    // Le profil utilisateur est créé automatiquement par le trigger PostgreSQL (avec consentements si fournis)
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signInWithGoogle = async (consent?: {
    privacyPolicyAcceptedAt: string;
    termsAcceptedAt: string;
  }) => {
    if (consent) {
      sessionStorage.setItem(OAUTH_CONSENT_STORAGE_KEY, JSON.stringify(consent));
    }

    const base = getAppBaseUrl();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: base ? `${base}/` : undefined,
      },
    });

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    // Après suppression de compte ou session déjà révoquée, le logout global renvoie 403 :
    // on efface quand même la session locale.
    if (error) {
      await supabase.auth.signOut({ scope: 'local' });
    }
    setUser(null);
    setSession(null);
  };

  const sendPasswordReset = async (email: string) => {
    const base = getAppBaseUrl();

    // Important sur GitHub Pages : l’hébergement statique ne gère pas le fallback SPA.
    // On force donc un trailing slash, afin que l’URL cible corresponde à un dossier (dist/reset-password/index.html)
    // généré dans le postbuild.
    const redirectTo = base ? `${base}/reset-password/` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
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
    inAppNotificationsEnabled?: boolean;
    marketingEmailsConsent?: boolean;
    applicationsGoal?: number | null;
    avatarUrl?: string | null;
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
    if (data.inAppNotificationsEnabled !== undefined) updates.in_app_notifications_enabled = data.inAppNotificationsEnabled;
    if (data.applicationsGoal !== undefined) updates.applications_goal = data.applicationsGoal === null || data.applicationsGoal === 0 ? null : data.applicationsGoal;
    if (data.marketingEmailsConsent !== undefined) updates.marketing_emails_consent = data.marketingEmailsConsent;
    if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl;

    let { error } = await supabase.from('users').update(updates).eq('id', session.user.id);

    if (error && isSupabaseSchemaError(error) && updates.in_app_notifications_enabled !== undefined) {
      markInAppNotificationsColumnMissing();
      const { in_app_notifications_enabled: _removed, ...updatesWithoutInApp } = updates;
      if (Object.keys(updatesWithoutInApp).length > 0) {
        const retry = await supabase.from('users').update(updatesWithoutInApp).eq('id', session.user.id);
        error = retry.error;
      } else {
        error = null;
      }
    }

    if (!error && updates.in_app_notifications_enabled !== undefined) {
      markInAppNotificationsColumnPresent();
    }

    if (!error) {
      await loadUserProfile(session.user);
    }

    return { error };
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await loadUserProfile(session.user);
    }
  };

  return (
    <SupabaseAuthReactContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        sendPasswordReset,
        updatePassword,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </SupabaseAuthReactContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthReactContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};

