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

function isTodayOrTomorrow(dateStr: string): boolean {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const diff = (d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  return diff >= 0 && diff <= 1;
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

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const { data: users } = await supabase
    .from('users')
    .select('id, email, first_name')
    .eq('reminder_emails_enabled', true)
    .not('email', 'is', null);

  if (!users?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0, message: 'No users with reminders enabled' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let sent = 0;
  for (const user of users) {
    const userId = user.id;
    const email = user.email;
    const firstName = user.first_name || 'Candidat';

    const { data: applications } = await supabase
      .from('applications')
      .select('id, company_name, position, application_date, created_at, last_relance_at, status, interview_date, interview_time, interview_place')
      .eq('user_id', userId);

    const toRelance: typeof applications = [];
    const interviews: typeof applications = [];

    for (const app of applications || []) {
      if (app.status === 'pending') {
        const refDate = app.application_date ?? (app as { created_at?: string }).created_at;
        if (refDate) {
          const daysAgo = getDaysAgo(refDate);
          if (app.last_relance_at) {
            const daysSinceRelance = getDaysAgo(app.last_relance_at);
            if (daysSinceRelance >= DAYS_BEFORE_REMINDER && daysAgo >= DAYS_BEFORE_REMINDER) toRelance.push(app);
          } else if (daysAgo >= DAYS_BEFORE_REMINDER) {
            toRelance.push(app);
          }
        }
      }
      if (app.status === 'interview' && app.interview_date && isTodayOrTomorrow(app.interview_date)) {
        interviews.push(app);
      }
    }

    if (toRelance.length === 0 && interviews.length === 0) continue;

    const parts: string[] = [];
    if (toRelance.length > 0) {
      parts.push('<h3>⏰ Candidatures à relancer</h3><ul>');
      for (const a of toRelance) {
        const days = getDaysAgo(a.application_date || '');
        parts.push(`<li><strong>${a.company_name}</strong> – ${a.position} (il y a ${days} jours)</li>`);
      }
      parts.push('</ul>');
    }
    if (interviews.length > 0) {
      parts.push('<h3>📅 Entretiens à venir (aujourd\'hui ou demain)</h3><ul>');
      for (const a of interviews) {
        const time = a.interview_time ? ` à ${String(a.interview_time).slice(0, 5)}` : '';
        const place = a.interview_place ? ` – ${a.interview_place}` : '';
        parts.push(`<li><strong>${a.company_name}</strong> – ${a.position} le ${a.interview_date}${time}${place}</li>`);
      }
      parts.push('</ul>');
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:20px;color:#333;} h2{color:#111;} ul{line-height:1.6;}</style></head>
<body>
  <p>Bonjour ${firstName},</p>
  <p>Voici vos rappels AlternanceTracker :</p>
  ${parts.join('')}
  <p>Connectez-vous sur l’application pour gérer vos candidatures et marquer les relances.</p>
  <p>— L’équipe AlternanceTracker</p>
</body>
</html>`;

    const ok = await sendEmail(email, 'Rappels AlternanceTracker – relances et entretiens', html);
    if (ok) sent++;
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
