// RGPD : droit à l'effacement — suppression du compte et de toutes les données
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Méthode non autorisée' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Non authentifié' }, 401);
  }

  const token = authHeader.slice(7);
  if (token === supabaseAnonKey) {
    return jsonResponse({ error: 'Utilisez le jeton de session utilisateur' }, 401);
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: getUserError } = await supabaseAuth.auth.getUser(token);
  if (getUserError || !user) {
    return jsonResponse({ error: 'Session invalide ou expirée' }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}/logout?scope=global`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      apikey: supabaseServiceRoleKey,
    },
  });

  const { error: rmAvatarErr } = await supabaseAdmin.storage.from('avatars').remove([`${user.id}/avatar`]);
  if (rmAvatarErr) console.warn('Avatar storage cleanup failed');

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Delete user error:', deleteError);
    return jsonResponse(
      { error: deleteError.message || 'Impossible de supprimer le compte' },
      500,
    );
  }

  return jsonResponse({ success: true, message: 'Compte et données supprimés' }, 200);
});
