import { useEffect, useState } from 'react';

const SupabaseConfigCheck = () => {
  const [isConfigured, setIsConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConfig = async () => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!url || !key || url === 'https://placeholder.supabase.co') {
        setIsConfigured(false);
        setError('Variables d\'environnement Supabase non configurées');
        return;
      }

      // Si les variables sont configurées, on considère que c'est OK
      // Les erreurs de connexion seront gérées ailleurs
      setIsConfigured(true);
    };

    checkConfig();
  }, []);

  if (!isConfigured || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-8">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="ml-3 text-2xl font-bold text-gray-900">Configuration requise</h1>
          </div>

          <div className="mt-4">
            <p className="text-gray-700 mb-4">
              {error || 'Les variables d\'environnement Supabase ne sont pas configurées.'}
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h2 className="font-semibold text-gray-900 mb-2">Étapes à suivre :</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Créez un fichier <code className="bg-gray-200 px-1 rounded">.env</code> dans le dossier <code className="bg-gray-200 px-1 rounded">frontend/</code></li>
                <li>Ajoutez les lignes suivantes :</li>
              </ol>
              <pre className="mt-3 bg-gray-800 text-green-400 p-4 rounded overflow-x-auto text-sm">
{`VITE_SUPABASE_URL=https://xvshjwddgchkbcoocenj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_NRxzcHi0SUATNwK3aE-H1g_4DCcpyAO`}
              </pre>
              <p className="mt-4 text-sm text-gray-600">
                <strong>Important :</strong> Redémarrez le serveur de développement après avoir créé le fichier .env
              </p>
            </div>

            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Recharger la page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SupabaseConfigCheck;

