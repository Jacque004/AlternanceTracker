import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const { sendPasswordReset } = useSupabaseAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await sendPasswordReset(email.trim());
      if (error) {
        // Ne pas afficher l'erreur détaillée pour éviter l'énumération.
        toast.error('Impossible d\'envoyer le lien de réinitialisation. Réessayez.');
      } else {
        toast.success('Si le compte existe, un email de réinitialisation vient d\'être envoyé.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Mot de passe oublié</h1>
            <p className="mt-2 text-sm text-gray-600">
              Saisissez votre email : nous vous enverrons un lien pour créer un nouveau mot de passe.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="vous@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            Retour à la{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline">
              connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

