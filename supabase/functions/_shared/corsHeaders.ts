/**
 * Configuration CORS sécurisée pour les Edge Functions Supabase.
 * Remplace Access-Control-Allow-Origin: * par une liste blanche d'origines autorisées.
 */

const ALLOWED_ORIGINS = [
  'https://votre-domaine.com',
  'https://www.votre-domaine.com',
  // Ajouter en production les domaines autorisés
];

// Ajouter localhost en développement
if (Deno.env.get('ENVIRONMENT') === 'development' || Deno.env.get('DENO_DEPLOYMENT_ID') === undefined) {
  ALLOWED_ORIGINS.push('http://localhost:3000');
  ALLOWED_ORIGINS.push('http://localhost:5173');
  ALLOWED_ORIGINS.push('http://127.0.0.1:3000');
  ALLOWED_ORIGINS.push('http://127.0.0.1:5173');
}

/**
 * Génère les headers CORS appropriés en fonction de l'origine de la requête.
 * Retourne une origine spécifique si elle est dans la liste blanche, sinon la première origine autorisée.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';

  // Vérifier si l'origine est dans la liste blanche
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : (ALLOWED_ORIGINS[0] || '*'); // Fallback si liste vide

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24h
  };
}

/**
 * Headers CORS par défaut (pour compatibilité).
 * DÉPRÉCIÉ : Utiliser getCorsHeaders(req) à la place.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0] || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
