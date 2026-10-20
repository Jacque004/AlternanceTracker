import { createContext } from 'react';
import { Session, AuthError } from '@supabase/supabase-js';
import type { LegalConsent } from '../config/legal';
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
    consent?: LegalConsent
  ) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: (consent?: LegalConsent) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    school?: string;
    formation?: string;
    studyYear?: string;
    preferredLocation?: string | null;
    preferredDomain?: string | null;
    preferredEducationLevel?: string | null;
    alternanceRhythm?: string;
    desiredStartDate?: string;
    linkedinUrl?: string;
    weeklySummaryEnabled?: boolean;
    reminderEmailsEnabled?: boolean;
    inAppNotificationsEnabled?: boolean;
    applicationsGoal?: number | null;
    marketingEmailsConsent?: boolean;
    privacyPolicyAcceptedAt?: string;
    termsAcceptedAt?: string;
    privacyPolicyVersion?: string;
    termsVersion?: string;
    minimumAgeConfirmedAt?: string;
    avatarUrl?: string | null;
  }) => Promise<{ error: unknown }>;
  refreshProfile: () => Promise<void>;
}

/** Contexte isolé pour limiter les erreurs HMR (double Provider) sous Vite. */
export const SupabaseAuthReactContext = createContext<SupabaseAuthContextType | undefined>(undefined);
