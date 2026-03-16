import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationService, dashboardService } from '../services/supabaseService';
import type { Application, ApplicationListParams } from '../types';
import * as XLSX from 'xlsx';
import { SkeletonList } from '../components/Skeleton';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  interview: 'Entretien',
  accepted: 'Acceptée',
  rejected: 'Refusée',
};

const SORT_OPTIONS: { value: ApplicationListParams['sortBy']; label: string }[] = [
  { value: 'created_at', label: 'Date d\'ajout' },
  { value: 'application_date', label: 'Date de candidature' },
  { value: 'company_name', label: 'Entreprise (A–Z)' },
  { value: 'status', label: 'Statut' },
];

function formatDate(s: string | undefined) {
  if (!s) return '–';
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(s: string | undefined) {
  if (!s) return '';
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return new Date(s).toTimeString().slice(0, 5);
}

function exportCSV(apps: Application[]) {
  const headers = ['Entreprise', 'Poste', 'Statut', 'Date candidature', 'Date réponse', 'Date entretien', 'Heure', 'Lieu entretien', 'Lieu', 'Notes', 'URL'];
  const rows = apps.map((a) => [
    a.companyName,
    a.position,
    STATUS_LABELS[a.status] || a.status,
    formatDate(a.applicationDate),
    formatDate(a.responseDate),
    formatDate(a.interviewDate),
    formatTime(a.interviewTime),
    a.interviewPlace || '',
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

function exportExcel(apps: Application[]) {
  const headers = ['Entreprise', 'Poste', 'Statut', 'Date candidature', 'Date réponse', 'Date entretien', 'Heure', 'Lieu entretien', 'Lieu', 'Notes', 'URL'];
  const rows = apps.map((a) => [
    a.companyName,
    a.position,
    STATUS_LABELS[a.status] || a.status,
    formatDate(a.applicationDate),
    formatDate(a.responseDate),
    formatDate(a.interviewDate),
    formatTime(a.interviewTime),
    a.interviewPlace || '',
    a.location || '',
    (a.notes || '').replace(/\n/g, ' '),
    a.jobUrl || '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Candidatures');
  XLSX.writeFile(wb, `candidatures-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
          <td>${formatDate(a.interviewDate)} ${formatTime(a.interviewTime)}</td>
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
              <th>Entretien</th>
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

async function exportPDFDashboard() {
  const [result, stats] = await Promise.all([
    applicationService.getAll({ sortBy: 'created_at', sortOrder: 'desc' }),
    dashboardService.getStatistics(),
  ]);
  const recent = result.data.slice(0, 15);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const rows = recent
    .map(
      (a) =>
        `<tr>
          <td>${a.companyName}</td>
          <td>${a.position}</td>
          <td>${STATUS_LABELS[a.status] || a.status}</td>
          <td>${formatDate(a.applicationDate)}</td>
        </tr>`
    )
    .join('');
  const statsHtml = stats
    ? `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
        <span><strong>Total:</strong> ${stats.total}</span>
        <span><strong>En attente:</strong> ${stats.pending}</span>
        <span><strong>Entretiens:</strong> ${stats.interview}</span>
        <span><strong>Acceptées:</strong> ${stats.accepted}</span>
        <span><strong>Refusées:</strong> ${stats.rejected}</span>
      </div>`
    : '';
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Tableau de bord – AlternanceTracker</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #111; }
          h1 { font-size: 1.25rem; margin-bottom: 8px; }
          h2 { font-size: 1rem; margin: 16px 0 8px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>Tableau de bord – ${new Date().toLocaleDateString('fr-FR')}</h1>
        ${statsHtml}
        <h2>Dernières candidatures</h2>
        <table>
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Poste</th>
              <th>Statut</th>
              <th>Date candidature</th>
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

const PAGE_SIZE = 20;

const Applications = () => {
  const [list, setList] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<ApplicationListParams['sortBy']>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchDebounced, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    setLoading(true);
    const params: ApplicationListParams = {
      sortBy,
      sortOrder,
      page,
      pageSize: PAGE_SIZE,
    };
    if (statusFilter) params.status = statusFilter;
    if (searchDebounced.trim()) params.search = searchDebounced.trim();
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    applicationService
      .getAll(params)
      .then((res) => {
        setList(res.data);
        setTotal(res.total);
      })
      .catch(() => { setList([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [statusFilter, searchDebounced, dateFrom, dateTo, sortBy, sortOrder, page]);

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
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
          >
            ➕ Ajouter une candidature
          </Link>
          <button
            type="button"
            onClick={async () => {
              const res = await applicationService.getAll({ sortBy, sortOrder, status: statusFilter || undefined, search: searchDebounced.trim() || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
              exportCSV(res.data);
            }}
            disabled={total === 0}
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors duration-200"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={async () => {
              const res = await applicationService.getAll({ sortBy, sortOrder, status: statusFilter || undefined, search: searchDebounced.trim() || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
              exportExcel(res.data);
            }}
            disabled={total === 0}
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors duration-200"
          >
            Export Excel
          </button>
          <button
            type="button"
            onClick={async () => {
              const res = await applicationService.getAll({ sortBy, sortOrder, status: statusFilter || undefined, search: searchDebounced.trim() || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
              exportPDF(res.data);
            }}
            disabled={total === 0}
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors duration-200"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => exportPDFDashboard()}
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium"
          >
            PDF Tableau de bord
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              placeholder="Rechercher (entreprise, poste, notes…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border-gray-300 text-sm w-64 max-w-full focus:border-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Tous</option>
              <option value="pending">En attente</option>
              <option value="interview">Entretien</option>
              <option value="accepted">Acceptée</option>
              <option value="rejected">Refusée</option>
            </select>
            <span className="text-sm font-medium text-gray-700">Du :</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">Au :</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">Tri :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy((e.target.value as ApplicationListParams['sortBy']))}
              className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="desc">Récent / Z→A</option>
              <option value="asc">Ancien / A→Z</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8">
              <div className="h-7 w-48 skeleton rounded-lg mb-6" />
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 space-y-2">
                  <div className="h-9 w-full skeleton rounded" />
                  <div className="flex gap-2">
                    <div className="h-9 w-24 skeleton rounded" />
                    <div className="h-9 w-32 skeleton rounded" />
                  </div>
                </div>
                <div className="p-4">
                  <SkeletonList lines={8} />
                </div>
              </div>
            </div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucune candidature.{' '}
              <Link to="/applications/new" className="text-primary-600 font-medium hover:underline">
                Ajouter une candidature
              </Link>
            </div>
          ) : (
            <>
            <ul className="divide-y divide-gray-200">
              {list.map((app) => (
                <li key={app.id} className="flex items-center gap-2 transition-colors duration-150">
                  <Link
                    to={`/applications/${app.id}/edit`}
                    className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-gray-50 transition-colors duration-150 flex-1 min-w-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{app.companyName}</p>
                      <p className="text-sm text-gray-500">{app.position}</p>
                      {(app.applicationDate || app.notes || (app.status === 'interview' && app.interviewDate)) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(app.applicationDate)}
                          {app.status === 'interview' && app.interviewDate && (
                            <> · Entretien {formatDate(app.interviewDate)}{app.interviewTime ? ` ${formatTime(app.interviewTime)}` : ''}{app.interviewPlace ? ` – ${app.interviewPlace}` : ''}</>
                          )}
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
                  <Link
                    to={`/preparer/lettres?company=${encodeURIComponent(app.companyName)}&position=${encodeURIComponent(app.position)}`}
                    className="shrink-0 px-2 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded"
                    title="Générer une lettre"
                  >
                    ✉️
                  </Link>
                </li>
              ))}
            </ul>
            {total > PAGE_SIZE && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {((page - 1) * PAGE_SIZE) + 1} – {Math.min(page * PAGE_SIZE, total)} sur {total}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * PAGE_SIZE >= total}
                    className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Applications;
