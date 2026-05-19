import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService } from '../services/adminService';
import { AdminRecentUser, AdminStats } from '../types';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { ApplicationsMonthlyChart } from '../components/ApplicationsMonthlyChart';
import { SkeletonStats } from '../components/Skeleton';
import { userFacingErrorMessage } from '../utils/errorMessage';
import { formatDisplayDate } from '../utils/dateDisplay';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  interview: 'Entretien',
  accepted: 'Acceptée',
  rejected: 'Refusée',
};

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

const AdminDashboard = () => {
  const { user: currentUser, refreshProfile } = useSupabaseAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminRecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [statsData, usersData] = await Promise.all([
      adminService.getStats(),
      adminService.listUsers(100),
    ]);
    setStats(statsData);
    setUsers(usersData);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadData();
      } catch (e) {
        toast.error(userFacingErrorMessage(e, 'Impossible de charger le panneau admin.'));
        setStats(null);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  const handleRoleChange = async (targetUser: AdminRecentUser, makeAdmin: boolean) => {
    if (targetUser.is_admin === makeAdmin) return;

    setRoleUpdatingId(targetUser.id);
    try {
      await adminService.setUserAdmin(targetUser.id, makeAdmin);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_admin: makeAdmin } : u))
      );
      toast.success(
        makeAdmin
          ? `${targetUser.email} est maintenant administrateur.`
          : `${targetUser.email} n'est plus administrateur.`
      );

      if (currentUser?.id === targetUser.id) {
        await refreshProfile();
      }
    } catch (e) {
      toast.error(userFacingErrorMessage(e, 'Impossible de modifier le rôle.'));
    } finally {
      setRoleUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto stack-page page-shell">
        <div>
          <div className="h-9 w-56 skeleton rounded-lg" />
          <div className="h-4 w-80 skeleton rounded mt-2" />
        </div>
        <SkeletonStats count={4} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-6xl mx-auto stack-page page-shell">
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="mt-2 text-gray-600">
          Les données ne sont pas disponibles. Exécutez les migrations 021, 022 et 023 dans Supabase.
        </p>
        <Link to="/profile" className="mt-4 inline-block text-primary-600 hover:text-primary-700 text-sm font-medium">
          Retour à Mon espace
        </Link>
      </div>
    );
  }

  const statusEntries = Object.entries(stats.applicationsByStatus);
  const adminCount = users.filter((u) => u.is_admin).length;

  return (
    <div className="max-w-6xl mx-auto stack-page page-shell">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Administration</h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600">
            Statistiques et gestion des rôles utilisateurs.
          </p>
        </div>
        <Link
          to="/profile"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 shrink-0"
        >
          ← Mon espace
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Utilisateurs inscrits" value={stats.usersCount} />
        <StatCard label="Candidatures totales" value={stats.applicationsCount} />
        <StatCard
          label="Nouveaux utilisateurs (7 j)"
          value={stats.usersLast7Days}
          hint="Inscriptions sur les 7 derniers jours"
        />
        <StatCard
          label="Administrateurs"
          value={adminCount}
          hint="Comptes avec accès au panel"
        />
      </div>

      {stats.monthlyData.length > 0 ? (
        <ApplicationsMonthlyChart monthlyData={stats.monthlyData} />
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="bg-white rounded-xl border border-gray-200 shadow-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-gray-900">Candidatures par statut</h2>
          {statusEntries.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Aucune candidature enregistrée.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {statusEntries.map(([status, count]) => (
                <li
                  key={status}
                  className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-700">{STATUS_LABELS[status] ?? status}</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-gray-900">Activité récente</h2>
          <ul className="mt-4 space-y-3 text-sm text-gray-600">
            <li>
              <span className="font-medium text-gray-900">{stats.applicationsLast7Days}</span> nouvelles
              candidatures (7 jours)
            </li>
            <li>
              <span className="font-medium text-gray-900">{stats.usersLast7Days}</span> nouveaux comptes
              (7 jours)
            </li>
          </ul>
        </section>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 shadow-card p-5 sm:p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Gestion des utilisateurs</h2>
            <p className="mt-1 text-sm text-gray-500">
              Attribuez le rôle administrateur depuis la liste (100 derniers comptes).
            </p>
          </div>
        </div>

        {users.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun utilisateur.</p>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 pr-3 font-medium">Nom</th>
                  <th className="pb-2 pr-3 font-medium">E-mail</th>
                  <th className="pb-2 pr-3 font-medium">Inscription</th>
                  <th className="pb-2 font-medium">Rôle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  const isUpdating = roleUpdatingId === u.id;
                  return (
                    <tr key={u.id} className={isSelf ? 'bg-primary-50/40' : undefined}>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                        {isSelf ? (
                          <span className="ml-1 text-xs text-primary-600">(vous)</span>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-3 max-w-[160px] sm:max-w-[200px] truncate" title={u.email}>
                        {u.email}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-gray-600">
                        {formatDisplayDate(u.created_at)}
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        <label className="sr-only" htmlFor={`role-${u.id}`}>
                          Rôle de {u.email}
                        </label>
                        <select
                          id={`role-${u.id}`}
                          value={u.is_admin ? 'admin' : 'user'}
                          disabled={isUpdating || (isSelf && u.is_admin)}
                          onChange={(e) => void handleRoleChange(u, e.target.value === 'admin')}
                          className="rounded-lg border border-gray-200 bg-white py-1.5 pl-2 pr-8 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="user">Utilisateur</option>
                          <option value="admin">Administrateur</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-500">
          Vous ne pouvez pas retirer votre propre rôle administrateur. Il doit toujours rester au moins un
          administrateur sur la plateforme.
        </p>
      </section>
    </div>
  );
};

export default AdminDashboard;
