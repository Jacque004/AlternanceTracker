// RGPD : avertissement puis suppression des comptes inactifs depuis 24 mois.
// Appel réservé au cron : Authorization: Bearer CRON_SECRET.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CRON_SECRET = Deno.env.get('CRON_SECRET');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'AlternanceTracker <onboarding@resend.dev>';
const APP_URL = Deno.env.get('APP_URL') || 'https://jacque004.github.io/AlternanceTracker/';
const INACTIVITY_MONTHS = 24;
const WARNING_DAYS = 30;

function monthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => {
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    if (char === '>') return '&gt;';
    return '&quot;';
  });
}

async function sendWarning(to: string, firstName: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const safeName = escapeHtml(firstName.trim());
  const greeting = safeName ? `Bonjour ${safeName},` : 'Bonjour,';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Votre compte AlternanceTracker sera supprimé dans 30 jours',
      html: `<p>${greeting}</p>
        <p>Votre compte n’a pas été ouvert depuis près de ${INACTIVITY_MONTHS} mois.</p>
        <p>Sans connexion dans les ${WARNING_DAYS} jours, le compte et les données associées (candidatures, CV, lettres, photo) seront supprimés.</p>
        <p><a href="${APP_URL}">Ouvrir AlternanceTracker</a> conserve le compte.</p>`,
    }),
  });
  return res.ok;
}

serve(async (req) => {
  if (!CRON_SECRET || req.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Configuration manquante' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const warnBefore = monthsAgo(INACTIVITY_MONTHS - 1);
  const deleteBefore = monthsAgo(INACTIVITY_MONTHS);
  const warningMature = daysAgo(WARNING_DAYS);

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({
        warned: 0,
        deleted: 0,
        skipped: 'RESEND_API_KEY absente : aucun compte supprimé sans e-mail d’avertissement',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { data: stale, error: listError } = await admin
    .from('users')
    .select('id, email, first_name, last_seen_at, inactivity_warning_sent_at, privacy_policy_version')
    .lt('last_seen_at', warnBefore)
    .limit(100);

  if (listError) {
    console.error('Inactive accounts list failed');
    return new Response(JSON.stringify({ error: 'Lecture impossible' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let warned = 0;
  let deleted = 0;

  for (const row of stale ?? []) {
    if (!row.privacy_policy_version) continue;
    const lastSeen = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
    const warningAt = row.inactivity_warning_sent_at
      ? new Date(row.inactivity_warning_sent_at).getTime()
      : 0;
    const warningCoversThisInactivity = warningAt > lastSeen;

    if (row.last_seen_at < deleteBefore && warningCoversThisInactivity && row.inactivity_warning_sent_at <= warningMature) {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${row.id}/logout?scope=global`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      });
      await admin.storage.from('avatars').remove([`${row.id}/avatar`]);
      const { error: deleteError } = await admin.auth.admin.deleteUser(row.id);
      if (!deleteError) deleted += 1;
      continue;
    }

    if (!warningCoversThisInactivity && row.email) {
      const sent = await sendWarning(row.email, row.first_name ?? '');
      if (sent) {
        const { error: markError } = await admin
          .from('users')
          .update({ inactivity_warning_sent_at: new Date().toISOString() })
          .eq('id', row.id);
        if (!markError) warned += 1;
      }
    }
  }

  return new Response(JSON.stringify({ warned, deleted }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
