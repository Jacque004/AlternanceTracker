import { createContext } from 'react';
import { Session, AuthError } from '@supabase/supabase-js';
import { User as AppUser } from '../types';

export interface SupabaseAuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    consent?: { privacyPolicyAcceptedAt: string; termsAcceptedAt: string }
  ) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
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
    inAppNotificationsEnabled?: boolean;
    applicationsGoal?: number | null;
    marketingEmailsConsent?: boolean;
    avatarUrl?: string | null;
  }) => Promise<{ error: unknown }>;
  refreshProfile: () => Promise<void>;
}

/** Contexte isolé pour limiter les erreurs HMR (double Provider) sous Vite. */
export const SupabaseAuthReactContext = createContext<SupabaseAuthContextType | undefined>(undefined);
