import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from './toast';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { buildLegalConsent, legalConfig } from '../config/legal';
import { rgpdService } from '../services/supabaseService';
import { clearRhythmLocalData } from '../utils/rhythmCalendar';
import { userFacingErrorMessage } from '../utils/errorMessage';

/** Compte déjà créé (souvent via Google) ou politique devenue obsolète. */
export default function LegalAcceptance() {
  const { updateProfile, signOut } = useSupabaseAuth();
  const navigate = useNavigate();
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [age, setAge] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    if (!privacy || !terms || !age) {
      toast.error('Cochez les trois cases pour continuer.');
      return;
    }
    setSaving(true);
    const { error } = await updateProfile(buildLegalConsent());
    setSaving(false);
    if (error) {
      toast.error('Impossible d’enregistrer votre confirmation.');
      return;
    }
    toast.success('Confirmation enregistrée');
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await rgpdService.deleteMyAccount();
      clearRhythmLocalData();
      await signOut();
      toast.success('Compte supprimé');
      navigate('/');
    } catch (error: unknown) {
      toast.error(userFacingErrorMessage(error, 'Impossible de supprimer le compte.'));
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Avant de continuer</h1>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">
        Confirmez la politique de confidentialité et les conditions d’utilisation dans leur version du{' '}
        {legalConfig.policyVersion}. Elles décrivent les données du suivi de candidatures, les prestataires,
        la durée de conservation et la façon de supprimer le compte.
      </p>
      <div className="mt-6 space-y-3">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={privacy}
            onChange={(event) => setPrivacy(event.target.checked)}
            className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            J’ai lu la{' '}
            <Link to="/politique-confidentialite" className="text-primary-600 hover:underline">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={terms}
            onChange={(event) => setTerms(event.target.checked)}
            className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            J’accepte les{' '}
            <Link to="/cgu" className="text-primary-600 hover:underline">
              conditions générales d’utilisation
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={age}
            onChange={(event) => setAge(event.target.checked)}
            className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            J’ai au moins {legalConfig.minimumAge} ans.
          </span>
        </label>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => {
            void signOut().then(() => navigate('/', { replace: true }));
          }}
          disabled={saving || deleting}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 min-h-[44px] disabled:opacity-50"
        >
          Se déconnecter
        </button>
        <button
          type="button"
          disabled={saving || deleting}
          onClick={() => void confirm()}
          className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 min-h-[44px]"
        >
          {saving ? 'Enregistrement…' : 'Continuer'}
        </button>
      </div>
      <p className="mt-6 text-sm text-gray-600 leading-relaxed">
        Si vous ne souhaitez pas continuer, vous pouvez effacer le compte tout de suite. Les candidatures,
        documents et la photo sont supprimés.
      </p>
      <button
        type="button"
        onClick={() => void deleteAccount()}
        disabled={saving || deleting}
        className="mt-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-800 ring-1 ring-red-200 hover:bg-red-50 min-h-[44px] disabled:opacity-50"
      >
        {deleting ? 'Suppression…' : 'Supprimer mon compte'}
      </button>
    </div>
  );
}
