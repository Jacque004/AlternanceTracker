import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationService } from '../services/supabaseService';
import type { Application } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  interview: 'Entretien',
  accepted: 'Acceptée',
  rejected: 'Refusée',
};

function formatDate(s: string | undefined) {
  if (!s) return '–';
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function exportCSV(apps: Application[]) {
  const headers = ['Entreprise', 'Poste', 'Statut', 'Date candidature', 'Date réponse', 'Lieu', 'Notes', 'URL'];
  const rows = apps.map((a) => [
    a.companyName,
    a.position,
    STATUS_LABELS[a.status] || a.status,
    formatDate(a.applicationDate),
    formatDate(a.responseDate),
    a.location || '',
    (a.notes || '').replace(/\n/g, ' '),
    a.jobUrl || '',
  ]);
  const csv = [headers.join(';'), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `candidatures-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(apps: Application[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const rows = apps
    .map(
      (a) =>
        `<tr>
          <td>${a.companyName}</td>
          <td>${a.position}</td>
          <td>${STATUS_LABELS[a.status] || a.status}</td>
          <td>${formatDate(a.applicationDate)}</td>
          <td>${formatDate(a.responseDate)}</td>
        </tr>`
    )
    .join('');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Mes candidatures</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #111; }
          h1 { font-size: 1.5rem; margin-bottom: 1rem; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>Mes candidatures – ${new Date().toLocaleDateString('fr-FR')}</h1>
        <table>
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Poste</th>
              <th>Statut</th>
              <th>Date candidature</th>
              <th>Date réponse</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
  printWindow.close();
}

const Applications = () => {
  const [list, setList] = useState<Application[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationService
      .getAll(filter || undefined)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const filtered = list;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes candidatures</h1>
          <p className="mt-1 text-gray-600">Suivez et gérez toutes vos candidatures en un seul endroit.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/applications/new"
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium"
          >
            ➕ Ajouter une candidature
          </Link>
          <button
            type="button"
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => exportPDF(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium disabled:opacity-50"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filtrer par statut :</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">Tous</option>
            <option value="pending">En attente</option>
            <option value="interview">Entretien</option>
            <option value="accepted">Acceptée</option>
            <option value="rejected">Refusée</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 flex flex-col items-center gap-3 text-gray-500">
              <LoadingSpinner size="md" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucune candidature.{' '}
              <Link to="/applications/new" className="text-primary-600 font-medium hover:underline">
                Ajouter une candidature
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filtered.map((app) => (
                <li key={app.id}>
                  <Link
                    to={`/applications/${app.id}/edit`}
                    className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{app.companyName}</p>
                      <p className="text-sm text-gray-500">{app.position}</p>
                      {(app.applicationDate || app.notes) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(app.applicationDate)}
                          {app.notes && ` · ${app.notes.slice(0, 50)}${app.notes.length > 50 ? '…' : ''}`}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-sm font-medium px-2 py-1 rounded ${
                        app.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : app.status === 'interview'
                            ? 'bg-blue-100 text-blue-800'
                            : app.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {STATUS_LABELS[app.status] || app.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Applications;
