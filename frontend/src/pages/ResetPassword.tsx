import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { session, loading, updatePassword } = useSupabaseAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // En général, le lien Supabase établit une session automatiquement.
  // Si session n'est pas disponible, on guide l'utilisateur.
  useEffect(() => {
    if (!loading && !session) {
      // Pas encore de session: on affiche un message, pas d'autoredirection agressive.
    }
  }, [loading, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        toast.error(error.message || 'Impossible de réinitialiser le mot de passe.');
        return;
      }

      toast.success('Mot de passe mis à jour. Vous pouvez vous connecter.');
      navigate('/login');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
            <p className="mt-2 text-sm text-gray-600">
              {session ? 'Définissez votre nouveau mot de passe.' : 'Lien invalide ou session expirée. '}
              {!session && (
                <>
                  <Link to="/forgot-password" className="font-medium text-primary-600 hover:underline">
                    Renvoyer un lien
                  </Link>
                </>
              )}
            </p>
          </div>

          {session ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Mise à jour...' : 'Mettre à jour'}
              </button>

              <p className="text-center text-sm text-gray-600">
                Vous avez déjà un compte ?{' '}
                <Link to="/login" className="font-medium text-primary-600 hover:underline">
                  Connexion
                </Link>
              </p>
            </form>
          ) : (
            <div className="text-center text-sm text-gray-600 space-y-2">
              <p>Pour continuer, renvoyez un email de réinitialisation.</p>
              <div className="flex justify-center">
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700"
                >
                  Mot de passe oublié
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

