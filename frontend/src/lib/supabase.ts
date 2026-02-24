import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes !');
  console.error('VITE_SUPABASE_URL:', supabaseUrl || 'NON DÉFINI');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'DÉFINI' : 'NON DÉFINI');
  console.error('Créez un fichier .env dans le dossier frontend/ avec :');
  console.error('VITE_SUPABASE_URL=https://votre-projet.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=votre-cle-anon');
}

// Créer le client même si les variables sont manquantes pour éviter les erreurs de compilation
// L'application affichera des erreurs mais ne plantera pas
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

