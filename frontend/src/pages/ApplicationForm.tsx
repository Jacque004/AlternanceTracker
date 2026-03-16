import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { applicationService } from '../services/supabaseService';
import toast from 'react-hot-toast';
import type { Application } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'interview', label: 'Entretien' },
  { value: 'accepted', label: 'Acceptée' },
  { value: 'rejected', label: 'Refusée' },
];

function toInputDate(s: string | undefined) {
  if (!s) return '';
  const d = new Date(s);
  return d.toISOString().slice(0, 10);
}

/** Heure au format HH:MM pour input time */
function toInputTime(s: string | undefined) {
  if (!s) return '';
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  const d = new Date(s);
  return d.toTimeString().slice(0, 5);
}

const ApplicationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [loadOne, setLoadOne] = useState(true);
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

  useEffect(() => {
    if (!isEdit || !id) {
      setLoadOne(false);
      return;
    }
    applicationService
      .getById(Number(id))
      .then((app) => {
        setFormData({
          companyName: app.companyName,
          position: app.position,
          status: app.status,
          applicationDate: toInputDate(app.applicationDate),
          responseDate: toInputDate(app.responseDate),
          notes: app.notes || '',
          location: app.location || '',
          salaryRange: app.salaryRange || '',
          jobUrl: app.jobUrl || '',
          interviewDate: toInputDate(app.interviewDate),
          interviewTime: toInputTime(app.interviewTime),
          interviewPlace: app.interviewPlace || '',
        });
      })
      .catch(() => toast.error('Candidature introuvable'))
      .finally(() => setLoadOne(false));
  }, [isEdit, id]);

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
      navigate('/applications');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  if (loadOne) {
    return (
      <div className="max-w-2xl mx-auto py-12 flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEdit ? 'Modifier la candidature' : 'Nouvelle candidature'}
        </h1>
        <p className="mt-1 text-gray-600">
          {isEdit ? 'Modifiez les informations ci-dessous.' : 'Enregistrez une nouvelle candidature pour la suivre.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-card rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              {STATUS_OPTIONS.map((o) => (
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Ex. 1200-1400 €"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="jobUrl" className="block text-sm font-medium text-gray-700">
              Lien de l'offre
            </label>
            <input
              type="url"
              id="jobUrl"
              name="jobUrl"
              value={formData.jobUrl}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="https://..."
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Contact recruteur, relance prévue..."
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer la candidature'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/applications')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
          >
            Annuler
          </button>
          {formData.companyName.trim() && formData.position.trim() && (
            <Link
              to={`/preparer/lettres?company=${encodeURIComponent(formData.companyName)}&position=${encodeURIComponent(formData.position)}`}
              className="inline-flex items-center gap-1 bg-primary-50 hover:bg-primary-100 text-primary-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              ✉️ Générer une lettre pour cette candidature
            </Link>
          )}
        </div>
      </form>
    </div>
  );
};

export default ApplicationForm;
