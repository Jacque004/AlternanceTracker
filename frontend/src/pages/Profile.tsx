import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import toast from 'react-hot-toast';
import { rgpdService } from '../services/supabaseService';

function toInputDate(s: string | undefined) {
  if (!s) return '';
  return s.slice(0, 10);
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateProfile, signOut } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    school: '',
    formation: '',
    studyYear: '',
    alternanceRhythm: '',
    desiredStartDate: '',
    linkedinUrl: '',
    weeklySummaryEnabled: false,
    reminderEmailsEnabled: true,
    marketingEmailsConsent: false,
    applicationsGoal: '' as string | number,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        school: user.school || '',
        formation: user.formation || '',
        studyYear: user.studyYear || '',
        alternanceRhythm: user.alternanceRhythm || '',
        desiredStartDate: toInputDate(user.desiredStartDate) || '',
        linkedinUrl: user.linkedinUrl || '',
        weeklySummaryEnabled: user.weeklySummaryEnabled ?? false,
        reminderEmailsEnabled: user.reminderEmailsEnabled ?? true,
        marketingEmailsConsent: user.marketingEmailsConsent ?? false,
        applicationsGoal: user.applicationsGoal != null ? user.applicationsGoal : '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        school: formData.school || undefined,
        formation: formData.formation || undefined,
        studyYear: formData.studyYear || undefined,
        alternanceRhythm: formData.alternanceRhythm || undefined,
        desiredStartDate: formData.desiredStartDate || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        weeklySummaryEnabled: formData.weeklySummaryEnabled,
        reminderEmailsEnabled: formData.reminderEmailsEnabled,
        marketingEmailsConsent: formData.marketingEmailsConsent,
        applicationsGoal: formData.applicationsGoal === '' ? null : (typeof formData.applicationsGoal === 'number' ? formData.applicationsGoal : parseInt(String(formData.applicationsGoal), 10) || null),
      });
      if (error) {
        toast.error(error.message || 'Erreur lors de la mise à jour');
      } else {
        toast.success('Profil mis à jour avec succès');
      }
    } catch (_) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Mon profil</h1>

      <div className="bg-white shadow-card rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                Prénom
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Nom
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 cursor-not-allowed"
              />
              <p className="mt-1 text-sm text-gray-500">L'email ne peut pas être modifié</p>
            </div>

            <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Profil étudiant</h2>
            </div>
            <div>
              <label htmlFor="school" className="block text-sm font-medium text-gray-700">
                École / établissement
              </label>
              <input
                type="text"
                id="school"
                name="school"
                value={formData.school}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Ex. Université Paris-Saclay"
              />
            </div>
            <div>
              <label htmlFor="formation" className="block text-sm font-medium text-gray-700">
                Formation
              </label>
              <input
                type="text"
                id="formation"
                name="formation"
                value={formData.formation}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Ex. Master Informatique"
              />
            </div>
            <div>
              <label htmlFor="studyYear" className="block text-sm font-medium text-gray-700">
                Année
              </label>
              <input
                type="text"
                id="studyYear"
                name="studyYear"
                value={formData.studyYear}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Ex. L2, M1"
              />
            </div>
            <div>
              <label htmlFor="alternanceRhythm" className="block text-sm font-medium text-gray-700">
                Rythme d'alternance
              </label>
              <input
                type="text"
                id="alternanceRhythm"
                name="alternanceRhythm"
                value={formData.alternanceRhythm}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Ex. 2j école / 3j entreprise"
              />
            </div>
            <div>
              <label htmlFor="desiredStartDate" className="block text-sm font-medium text-gray-700">
                Date de début recherchée
              </label>
              <input
                type="date"
                id="desiredStartDate"
                name="desiredStartDate"
                value={formData.desiredStartDate}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-700">
                Lien LinkedIn
              </label>
              <input
                type="url"
                id="linkedinUrl"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <div>
              <label htmlFor="applicationsGoal" className="block text-sm font-medium text-gray-700">
                Objectif candidatures / semaine
              </label>
              <input
                type="number"
                id="applicationsGoal"
                name="applicationsGoal"
                min={0}
                value={formData.applicationsGoal}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Ex. 5"
              />
              <p className="mt-1 text-xs text-gray-500">Affiché sur le tableau de bord (0 = masqué)</p>
            </div>

            <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Notifications</h2>
              <p className="text-sm text-gray-500 mb-4">
                Activez ou désactivez ici les emails de rappels (relances, entretiens) et le résumé hebdomadaire.
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="reminderEmailsEnabled"
                    checked={formData.reminderEmailsEnabled}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Recevoir les rappels (relances, entretiens) par email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="weeklySummaryEnabled"
                    checked={formData.weeklySummaryEnabled}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Résumé hebdomadaire par email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="marketingEmailsConsent"
                    checked={formData.marketingEmailsConsent}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">J'accepte de recevoir des communications marketing (offres, actualités)</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Données personnelles (RGPD)</h2>
              <p className="text-sm text-gray-500 mb-4">
                Vous pouvez exporter toutes vos données ou supprimer définitivement votre compte.
              </p>
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  type="button"
                  disabled={exporting}
                  onClick={async () => {
                    setExporting(true);
                    try {
                      const data = await rgpdService.exportMyData();
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `alternance-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Export téléchargé');
                    } catch (e: any) {
                      toast.error(e?.message || 'Erreur lors de l\'export');
                    } finally {
                      setExporting(false);
                    }
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {exporting ? 'Export en cours...' : 'Télécharger mes données'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-md text-sm font-medium border border-red-200"
                >
                  Supprimer mon compte
                </button>
              </div>
              {user?.privacyPolicyAcceptedAt && (
                <p className="text-xs text-gray-500">
                  Politique de confidentialité acceptée le {new Date(user.privacyPolicyAcceptedAt).toLocaleDateString('fr-FR')}.
                  {user?.termsAcceptedAt && ` CGU acceptées le ${new Date(user.termsAcceptedAt).toLocaleDateString('fr-FR')}.`}
                </p>
              )}
            </div>
          </div>

          {deleteConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-title">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 id="delete-title" className="text-lg font-semibold text-gray-900 mb-2">Supprimer mon compte</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Cette action est irréversible. Toutes vos données (profil, candidatures, CV, lettres) seront définitivement supprimées.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(false)}
                    disabled={deleting}
                    className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await rgpdService.deleteMyAccount();
                        await signOut();
                        toast.success('Compte supprimé');
                        navigate('/');
                      } catch (e: any) {
                        toast.error(e?.message || 'Impossible de supprimer le compte');
                      } finally {
                        setDeleting(false);
                        setDeleteConfirmOpen(false);
                      }
                    }}
                    disabled={deleting}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Suppression...' : 'Confirmer la suppression'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
