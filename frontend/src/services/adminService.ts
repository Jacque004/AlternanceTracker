import { supabase } from '../lib/supabase';
import { AdminRecentUser, AdminStats } from '../types';

function mapRecentUser(row: Record<string, unknown>): AdminRecentUser {
  return {
    id: row.id as string,
    email: row.email as string,
    first_name: (row.first_name as string) ?? '',
    last_name: (row.last_name as string) ?? '',
    created_at: row.created_at as string,
    is_admin: Boolean(row.is_admin),
  };
}

export const adminService = {
  getStats: async (): Promise<AdminStats> => {
    const { data, error } = await supabase.rpc('admin_get_stats');

    if (error) {
      throw new Error(error.message || 'Impossible de charger les statistiques admin');
    }

    const raw = data as Record<string, unknown>;
    return {
      usersCount: Number(raw.usersCount ?? 0),
      applicationsCount: Number(raw.applicationsCount ?? 0),
      applicationsByStatus: (raw.applicationsByStatus as Record<string, number>) ?? {},
      usersLast7Days: Number(raw.usersLast7Days ?? 0),
      applicationsLast7Days: Number(raw.applicationsLast7Days ?? 0),
      monthlyData: (raw.monthlyData as AdminStats['monthlyData']) ?? [],
      recentUsers: (raw.recentUsers as AdminStats['recentUsers']) ?? [],
    };
  },

  listUsers: async (limit = 100): Promise<AdminRecentUser[]> => {
    const { data, error } = await supabase.rpc('admin_list_users', { p_limit: limit });

    if (error) {
      throw new Error(error.message || 'Impossible de charger la liste des utilisateurs');
    }

    const rows = (data as Record<string, unknown>[]) ?? [];
    return rows.map(mapRecentUser);
  },

  setUserAdmin: async (userId: string, makeAdmin: boolean): Promise<void> => {
    const { error } = await supabase.rpc('admin_set_user_admin', {
      p_user_id: userId,
      p_make_admin: makeAdmin,
    });

    if (error) {
      throw new Error(error.message || 'Impossible de modifier le rôle');
    }
  },

  checkIsAdmin: async (): Promise<boolean> => {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) {
      console.warn('is_admin RPC:', error);
      return false;
    }
    return data === true;
  },
};
