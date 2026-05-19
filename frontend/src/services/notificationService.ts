import { getISOWeek, getISOWeekYear } from 'date-fns';
import { supabase } from '../lib/supabase';
import { UserNotification, UserNotificationType } from '../types';
import {
  isInAppNotificationsColumnMissing,
  markInAppNotificationsColumnMissing,
} from '../utils/inAppNotificationsSchema';
import { isSupabaseConflictError, isSupabaseSchemaError } from '../utils/supabaseSchema';

function mapRow(row: Record<string, unknown>): UserNotification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as UserNotificationType,
    title: row.title as string,
    body: row.body as string,
    link: (row.link as string | null) ?? null,
    readAt: (row.read_at as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  };
}

function weeklyDedupeKey(date = new Date()): string {
  const year = getISOWeekYear(date);
  const week = getISOWeek(date);
  return `weekly_followup:${year}-W${String(week).padStart(2, '0')}`;
}

const insertLocks = new Set<string>();

async function existsByDedupeKey(userId: string, dedupeKey: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('dedupe_key', dedupeKey);

  if (error) {
    if (isSupabaseSchemaError(error)) return false;
    throw new Error(error.message || 'Impossible de vérifier les notifications');
  }

  return (count ?? 0) > 0;
}

async function isInAppNotificationsEnabled(): Promise<boolean> {
  if (isInAppNotificationsColumnMissing()) return true;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('users')
    .select('in_app_notifications_enabled')
    .eq('id', user.id)
    .single();

  if (error) {
    if (isSupabaseSchemaError(error)) {
      markInAppNotificationsColumnMissing();
    }
    return true;
  }

  return data?.in_app_notifications_enabled ?? true;
}

async function insertNotification(payload: {
  type: UserNotificationType;
  title: string;
  body: string;
  link?: string;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
}): Promise<UserNotification | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (!(await isInAppNotificationsEnabled())) return null;

  const row = {
    user_id: user.id,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    link: payload.link ?? null,
    dedupe_key: payload.dedupeKey ?? null,
    metadata: payload.metadata ?? {},
  };

  const doInsert = async () => {
    const { error } = await supabase.from('user_notifications').insert(row);
    if (error) {
      if (isSupabaseConflictError(error) || isSupabaseSchemaError(error)) return;
      console.error('Erreur création notification:', error);
      throw new Error(error.message || 'Impossible de créer la notification');
    }
  };

  if (payload.dedupeKey) {
    const lockKey = `${user.id}:${payload.dedupeKey}`;
    if (insertLocks.has(lockKey)) return null;
    insertLocks.add(lockKey);

    try {
      if (await existsByDedupeKey(user.id, payload.dedupeKey)) return null;
      await doInsert();
    } finally {
      insertLocks.delete(lockKey);
    }
    return null;
  }

  await doInsert();
  return null;
}

export const notificationService = {
  list: async (limit = 30): Promise<UserNotification[]> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (isSupabaseSchemaError(error)) return [];
      console.error('Erreur chargement notifications:', error);
      throw new Error(error.message || 'Impossible de charger les notifications');
    }

    return (data ?? []).map(mapRow);
  },

  getUnreadCount: async (): Promise<number> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) {
      if (!isSupabaseSchemaError(error)) {
        console.error('Erreur comptage notifications:', error);
      }
      return 0;
    }

    return count ?? 0;
  },

  markAsRead: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message || 'Impossible de marquer la notification comme lue');
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('user_notifications').delete().eq('id', id);

    if (error) {
      if (isSupabaseSchemaError(error)) return;
      throw new Error(error.message || 'Impossible de retirer la notification');
    }
  },

  markAllAsRead: async (): Promise<void> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) throw new Error(error.message || 'Impossible de marquer les notifications comme lues');
  },

  createApplicationCreated: async (companyName: string, position: string, applicationId: number) => {
    const company = companyName.trim() || 'l’entreprise';
    const role = position.trim() || 'le poste';
    return insertNotification({
      type: 'application_created',
      title: 'Candidature enregistrée',
      body: `Votre candidature chez ${company} pour « ${role} » a bien été enregistrée.`,
      link: `/applications/${applicationId}/edit`,
      metadata: { applicationId, companyName, position },
    });
  },

  ensureWelcome: async (firstName?: string) => {
    const name = firstName?.trim();
    const greeting = name ? `Bonjour ${name} ! ` : '';
    return insertNotification({
      type: 'welcome',
      title: 'Bienvenue sur AlternanceTracker',
      body: `${greeting}Votre compte est prêt. Ajoutez votre première candidature pour commencer le suivi.`,
      link: '/applications/new',
      dedupeKey: 'welcome',
    });
  },

  ensureWeeklyFollowUp: async (pendingCount: number) => {
    const dedupeKey = weeklyDedupeKey();
    let body =
      'C’est le début de la semaine : faites le point sur vos candidatures en cours et planifiez vos relances.';
    if (pendingCount > 0) {
      const label = pendingCount === 1 ? 'candidature' : 'candidatures';
      body = `C’est le début de la semaine. Vous avez ${pendingCount} ${label} en attente de réponse — pensez à les relancer si besoin.`;
    }
    return insertNotification({
      type: 'weekly_followup',
      title: 'Suivi hebdomadaire',
      body,
      link: '/applications',
      dedupeKey,
      metadata: { pendingCount },
    });
  },
};
