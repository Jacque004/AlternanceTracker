import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applicationService, aiService, interviewPrepService } from '../services/supabaseService';
import { formatDateForInput, formatTimeForInput } from '../utils/dateDisplay';
import { normalizeJobOfferUrl } from '../utils/jobOfferUrl';
import { looksLikeReaderOrErrorDump } from '../utils/jobOfferImport';
import toast from 'react-hot-toast';
import type { Application } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { ApplicationHistory } from '../components/ApplicationHistory';
import { InterviewPrepCard } from '../components/InterviewPrepCard';
import { userFacingErrorMessage } from '../utils/errorMessage';
import { APPLICATION_STATUS_OPTIONS } from '../utils/applicationStatus';
import { queryKeys } from '../query/keys';
import { invalidateApplicationCaches } from '../query/client';

const ApplicationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [fetchingImport, setFetchingImport] = useState(false);
  const applicationId = isEdit && id ? Number(id) : null;

  const appQuery = useQuery({
    queryKey: queryKeys.applications.detail(applicationId ?? 0),
    queryFn: () => applicationService.getById(applicationId!),
    enabled: applicationId != null && Number.isFinite(applicationId),
  });
  const eventsQuery = useQuery({
    queryKey: queryKeys.applications.events(applicationId ?? 0),
    queryFn: () => applicationService.getEvents(applicationId!),
    enabled: applicationId != null && Number.isFinite(applicationId),
  });
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    companyName: '',
    position: '',
    status: 'pending' as Application['status'],
    applicationDate: '',
    responseDate: '',
    notes: '',
    location: '',
    salaryRange: '',
    jobUrl: '',
    interviewDate: '',
    interviewTime: '',
    interviewPlace: '',
  });

  const prepQuery = useQuery({
    queryKey: queryKeys.applications.interviewPrep(applicationId ?? 0),
    queryFn: () => interviewPrepService.getByApplicationId(applicationId!),
    enabled:
      applicationId != null && Number.isFinite(applicationId) && formData.status === 'interview',
  });
  const generatePrep = useMutation({
    mutationFn: () => interviewPrepService.generate(applicationId!),
    onSuccess: (prep) => {
      queryClient.setQueryData(queryKeys.applications.interviewPrep(applicationId!), prep);
      toast.success('Préparation d’entretien générée.');
    },
    onError: (err) => {
      toast.error(userFacingErrorMessage(err, 'Impossible de générer la préparation.'));
    },
  });

  useEffect(() => {
    if (!isEdit || !id) {
      return;
    }
    const app = appQuery.data;
    if (!app) return;
    setFormData({
      companyName: app.companyName,
      position: app.position,
      status: app.status,
      applicationDate: formatDateForInput(app.applicationDate),
      responseDate: formatDateForInput(app.responseDate),
      notes: app.notes || '',
      location: app.location || '',
      salaryRange: app.salaryRange || '',
      jobUrl: app.jobUrl || '',
      interviewDate: formatDateForInput(app.interviewDate),
      interviewTime: formatTimeForInput(app.interviewTime),
      interviewPlace: app.interviewPlace || '',
    });
  }, [isEdit, id, appQuery.data]);

  useEffect(() => {
    if (appQuery.error) {
      toast.error(
        userFacingErrorMessage(appQuery.error, 'Candidature introuvable ou impossible à charger.')
      );
    }
  }, [appQuery.error]);

  useEffect(() => {
    if (isEdit) return;
    const q = searchParams.get('jobUrl') || searchParams.get('url');
    if (!q?.trim()) return;
    try {
      const decoded = decodeURIComponent(q.trim());
      const normalized = normalizeJobOfferUrl(decoded);
      if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        setFormData((prev) => ({ ...prev, jobUrl: normalized }));
      }
    } catch {
      /* param mal encodé : ignoré */
    }
  }, [isEdit, searchParams]);

  const handleImportFromUrl = async () => {
    const raw = formData.jobUrl.trim();
    if (!raw) {
      toast.error('Collez d’abord l’URL de l’offre.');
      return;
    }
    const url = normalizeJobOfferUrl(raw);
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('URL invalide : utilisez une adresse commençant par https:// (ou www.…).');
      return;
    }
    setFormData((prev) => ({ ...prev, jobUrl: url }));
    setFetchingImport(true);
    try {
      const meta = await aiService.fetchJobMetadataFromUrl(url);
      const safeCompany =
        meta.companyName?.trim() && !looksLikeReaderOrErrorDump(meta.companyName)
          ? meta.companyName.trim()
          : '';
      const safePosition =
        meta.position?.trim() && !looksLikeReaderOrErrorDump(meta.position) ? meta.position.trim() : '';
      const safeSnippet =
        meta.descriptionSnippet?.trim() && !looksLikeReaderOrErrorDump(meta.descriptionSnippet)
          ? meta.descriptionSnippet.trim()
          : '';
      const safeLocation =
        meta.location?.trim() && !looksLikeReaderOrErrorDump(meta.location) ? meta.location.trim() : '';
      const safeSalary =
        meta.salaryRange?.trim() && !looksLikeReaderOrErrorDump(meta.salaryRange)
          ? meta.salaryRange.trim()
          : '';

      const hasCompany = Boolean(safeCompany);
      const hasPosition = Boolean(safePosition);
      const hasSnippet = Boolean(safeSnippet);
      const hasLocation = Boolean(safeLocation);
      const hasSalary = Boolean(safeSalary);
      setFormData((prev) => {
        let notes = prev.notes;
        if (safeSnippet) {
          const marker = safeSnippet.slice(0, Math.min(60, safeSnippet.length));
          if (!notes.trim()) notes = safeSnippet;
          else if (!notes.includes(marker)) notes = `${notes}\n\n— Extrait de l’offre —\n${safeSnippet}`;
        }
        return {
          ...prev,
          jobUrl: meta.jobUrl || url,
          companyName: (safeCompany || prev.companyName).trim(),
          position: (safePosition || prev.position).trim(),
          location: safeLocation || prev.location,
          salaryRange: safeSalary || prev.salaryRange,
          notes,
        };
      });
      if (!hasCompany && !hasPosition && !hasSnippet && !hasLocation && !hasSalary) {
        toast(
          'La page a été lue, mais aucun détail exploitable n’a été reconnu (titre, entreprise, lieu, salaire…). Complétez à la main.',
          { duration: 5500 }
        );
      } else {
        toast.success('Champs mis à jour depuis la page. Vérifiez les informations avant d’enregistrer.');
      }
    } catch (e: unknown) {
      toast.error(userFacingErrorMessage(e, 'Import depuis l’URL impossible.'));
    } finally {
      setFetchingImport(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim() || !formData.position.trim()) {
      toast.error('Entreprise et poste sont obligatoires.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        companyName: formData.companyName.trim(),
        position: formData.position.trim(),
        status: formData.status,
        applicationDate: formData.applicationDate || undefined,
        responseDate: formData.responseDate || undefined,
        notes: formData.notes.trim() || undefined,
        location: formData.location.trim() || undefined,
        salaryRange: formData.salaryRange.trim() || undefined,
        jobUrl: formData.jobUrl.trim() || undefined,
        interviewDate: formData.status === 'interview' && formData.interviewDate ? formData.interviewDate : undefined,
        interviewTime: formData.status === 'interview' && formData.interviewTime ? formData.interviewTime : undefined,
        interviewPlace: formData.status === 'interview' && formData.interviewPlace.trim() ? formData.interviewPlace.trim() : undefined,
      };
      if (isEdit && id) {
        await applicationService.update(Number(id), payload);
        toast.success('Candidature mise à jour');
      } else {
        await applicationService.create(payload);
        toast.success('Candidature créée');
      }
      await invalidateApplicationCaches();
      navigate('/applications');
    } catch (err: unknown) {
      toast.error(userFacingErrorMessage(err, 'Erreur lors de l’enregistrement.'));
    } finally {
      setLoading(false);
    }
  };

  if (isEdit && appQuery.isPending && !appQuery.data) {
    return (
      <div className="max-w-2xl mx-auto py-12 flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto stack-page page-shell">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          {isEdit ? 'Modifier la candidature' : 'Nouvelle candidature'}
        </h1>
        <p className="mt-1.5 text-sm sm:text-base text-gray-600">
          {isEdit ? 'Modifiez les informations ci-dessous.' : 'Enregistrez une nouvelle candidature pour la suivre.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-card rounded-xl border border-gray-200 p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="sm:col-span-2 rounded-xl border border-sky-100 bg-sky-50/50 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Importer depuis l’URL de l’offre</h2>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-end">
              <div className="flex-1 min-w-0">
                <label htmlFor="jobUrl" className="block text-sm font-medium text-gray-700">
                  URL de l’offre
                </label>
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  id="jobUrl"
                  name="jobUrl"
                  value={formData.jobUrl}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 min-h-[44px]"
                  placeholder="https://…"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleImportFromUrl()}
                disabled={!formData.jobUrl.trim() || fetchingImport}
                className="shrink-0 inline-flex justify-center items-center min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {fetchingImport ? 'Lecture…' : 'Remplir depuis la page'}
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
              Entreprise *
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              required
              value={formData.companyName}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 min-h-[44px]"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="position" className="block text-sm font-medium text-gray-700">
              Poste *
            </label>
            <input
              type="text"
              id="position"
              name="position"
              required
              value={formData.position}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 min-h-[44px]"
              placeholder="Ex. Assistant commercial, Comptable, Infirmier, Technicien BTP, Designer…"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Statut
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 min-h-[44px]"
            >
              {APPLICATION_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Lieu
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="applicationDate" className="block text-sm font-medium text-gray-700">
              Date de candidature
            </label>
            <input
              type="date"
              id="applicationDate"
              name="applicationDate"
              value={formData.applicationDate}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="responseDate" className="block text-sm font-medium text-gray-700">
              Date de réponse
            </label>
            <input
              type="date"
              id="responseDate"
              name="responseDate"
              value={formData.responseDate}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          {formData.status === 'interview' && (
            <>
              <div>
                <label htmlFor="interviewDate" className="block text-sm font-medium text-gray-700">
                  Date d'entretien *
                </label>
                <input
                  type="date"
                  id="interviewDate"
                  name="interviewDate"
                  value={formData.interviewDate}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="interviewTime" className="block text-sm font-medium text-gray-700">
                  Heure (optionnel)
                </label>
                <input
                  type="time"
                  id="interviewTime"
                  name="interviewTime"
                  value={formData.interviewTime}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 min-h-[44px]"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="interviewPlace" className="block text-sm font-medium text-gray-700">
                  Lieu (optionnel)
                </label>
                <input
                  type="text"
                  id="interviewPlace"
                  name="interviewPlace"
                  value={formData.interviewPlace}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 min-h-[44px]"
                  placeholder="Adresse ou visio"
                />
              </div>
            </>
          )}

          <div className="sm:col-span-2">
            <label htmlFor="salaryRange" className="block text-sm font-medium text-gray-700">
              Fourchette salariale
            </label>
            <input
              type="text"
              id="salaryRange"
              name="salaryRange"
              value={formData.salaryRange}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 min-h-[44px]"
              placeholder="Ex. 1200-1400 €"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 min-h-[44px]"
              placeholder="Contact recruteur, relance prévue..."
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center items-center min-h-[44px] w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer la candidature'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/applications')}
            className="inline-flex justify-center items-center min-h-[44px] w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            Annuler
          </button>
          {formData.companyName.trim() && formData.position.trim() && (
            <Link
              to={`/preparer/lettres?company=${encodeURIComponent(formData.companyName)}&position=${encodeURIComponent(formData.position)}`}
              className="inline-flex justify-center items-center gap-1 min-h-[44px] w-full sm:w-auto text-center bg-primary-50 hover:bg-primary-100 text-primary-700 px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              ✉️ Générer une lettre pour cette candidature
            </Link>
          )}
        </div>
      </form>

      {isEdit && formData.status === 'interview' && applicationId ? (
        <InterviewPrepCard
          companyName={formData.companyName}
          prep={prepQuery.data ?? null}
          loading={prepQuery.isPending && !prepQuery.data}
          generating={generatePrep.isPending}
          onGenerate={() => generatePrep.mutate()}
        />
      ) : null}

      {isEdit ? (
        <section className="bg-white shadow-card rounded-xl border border-gray-200 p-4 sm:p-6 md:p-8">
          <h2 className="text-lg font-semibold text-gray-900">Journal</h2>
          <p className="mt-1 text-sm text-gray-500">
            Changements de statut, relances et déplacements d’entretien.
          </p>
          <div className="mt-4">
            <ApplicationHistory
              events={eventsQuery.data ?? []}
              loading={eventsQuery.isPending && !eventsQuery.data}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default ApplicationForm;
