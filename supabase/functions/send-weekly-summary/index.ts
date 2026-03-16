import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CRON_SECRET = Deno.env.get('CRON_SECRET');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'AlternanceTracker <onboarding@resend.dev>';

const DAYS_BEFORE_REMINDER = 7;

function getDaysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', res.status, err);
    return false;
  }
  return true;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  interview: 'Entretien',
  accepted: 'Acceptée',
  rejected: 'Refusée',
};

serve(async (req) => {
  const auth = req.headers.get('Authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: users } = await supabase
    .from('users')
    .select('id, email, first_name')
    .eq('weekly_summary_enabled', true)
    .not('email', 'is', null);

  if (!users?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0, message: 'No users with weekly summary enabled' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  let sent = 0;
  for (const user of users) {
    const userId = user.id;
    const email = user.email;
    const firstName = user.first_name || 'Candidat';

    const { data: applications } = await supabase
      .from('applications')
      .select('id, company_name, position, status, application_date, created_at, last_relance_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const total = applications?.length ?? 0;
    const byStatus: Record<string, number> = {};
    const recent: typeof applications = [];
    let toRelanceCount = 0;

    for (const app of applications || []) {
      byStatus[app.status] = (byStatus[app.status] || 0) + 1;
      if (new Date(app.created_at) >= new Date(weekAgo)) recent.push(app);
      if (app.status === 'pending') {
        const refDate = app.application_date ?? app.created_at;
        if (refDate) {
          const daysAgo = getDaysAgo(refDate);
          if (app.last_relance_at) {
            if (getDaysAgo(app.last_relance_at) >= DAYS_BEFORE_REMINDER && daysAgo >= DAYS_BEFORE_REMINDER) toRelanceCount++;
          } else if (daysAgo >= DAYS_BEFORE_REMINDER) {
            toRelanceCount++;
          }
        }
      }
    }

    const statsRows = Object.entries(byStatus)
      .map(([k, v]) => `<tr><td>${STATUS_LABELS[k] || k}</td><td>${v}</td></tr>`)
      .join('');
    const recentRows = (recent.slice(0, 10) || [])
      .map((a) => `<tr><td>${a.company_name}</td><td>${a.position}</td><td>${STATUS_LABELS[a.status] || a.status}</td></tr>`)
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:20px;color:#333;} table{border-collapse:collapse;width:100%;max-width:400px;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background:#f5f5f5;}</style></head>
<body>
  <p>Bonjour ${firstName},</p>
  <p>Voici votre résumé de la semaine AlternanceTracker.</p>
  <h3>📊 En bref</h3>
  <p><strong>${total}</strong> candidature(s) au total.</p>
  ${statsRows ? '<table><tr><th>Statut</th><th>Nombre</th></tr>' + statsRows + '</table>' : ''}
  ${toRelanceCount > 0 ? `<p><strong>⏰ ${toRelanceCount}</strong> candidature(s) à relancer (≥ ${DAYS_BEFORE_REMINDER} jours).</p>` : ''}
  <h3>📋 Dernières candidatures (7 jours)</h3>
  ${recentRows ? '<table><tr><th>Entreprise</th><th>Poste</th><th>Statut</th></tr>' + recentRows + '</table>' : '<p>Aucune nouvelle candidature cette semaine.</p>'}
  <p>Connectez-vous sur l’application pour mettre à jour vos candidatures.</p>
  <p>— L’équipe AlternanceTracker</p>
</body>
</html>`;

    const ok = await sendEmail(email, 'Résumé hebdo AlternanceTracker', html);
    if (ok) sent++;
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
