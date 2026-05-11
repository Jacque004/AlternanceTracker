import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2';

/** Exige un JWT utilisateur valide (refuse la clé anon passée en Bearer). */
export async function requireSupabaseUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<{ user: User } | Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Configuration serveur incomplète' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.slice(7);
  if (token === supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Utilisez le jeton de session utilisateur' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser(token);
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Session invalide ou expirée' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return { user };
}
