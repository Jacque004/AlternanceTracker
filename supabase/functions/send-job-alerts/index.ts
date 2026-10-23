// E-mails d'alertes d'offres. Authorization: Bearer CRON_SECRET (comme send-reminders).
// Appelée à la fin de collect-job-offers, et par un cron de secours.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  jobAlertLabel,
  jobAlertResultsPath,
  offerMatchesAlert,
  plainSearchTerm,
  type AlertMatchOffer,
  type JobAlertCriteria,
} from '../../../frontend/src/services/jobOffers/matchJobAlert.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'AlternanceTracker <onboarding@resend.dev>';
const APP_URL = (Deno.env.get('APP_URL') || 'https://jacque004.github.io/AlternanceTracker').replace(/\/$/, '');

const LOOKBACK_DAYS = 30;
const FETCH_LIMIT = 40;
const LISTED_IN_EMAIL = 12;

const jsonHeaders = { 'Content-Type': 'application/json' };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ilikePattern(raw: string | null): string | null {
  const term = plainSearchTerm(raw);
  return term ? `*${term}*` : null;
}

function appHref(path: string): string {
  return `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
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
    console.error('Resend error:', res.status, await res.text());
    return false;
  }
  return true;
}

interface AlertRow {
  id: string;
  user_id: string;
  label: string | null;
  keywords: string | null;
  location: string | null;
  domain: string | null;
  education_level: string | null;
  contract: 'stage' | 'alternance' | null;
  remote: 'yes' | 'no' | null;
  source: string | null;
  created_at: string;
}

interface OfferRow {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
  contract_type: string | null;
  education_level: string | null;
  domain: string | null;
  description: string | null;
  remote: boolean | null;
  source: string;
  status: string;
  is_demo: boolean;
}

function criteriaOf(alert: AlertRow): JobAlertCriteria {
  return {
    keywords: alert.keywords,
    location: alert.location,
    domain: alert.domain,
    educationLevel: alert.education_level,
    contract: alert.contract,
    remote: alert.remote,
    source: alert.source,
  };
}

function toMatchOffer(row: OfferRow): AlertMatchOffer {
  return {
    title: row.title,
    companyName: row.company_name,
    location: row.location,
    contractType: row.contract_type,
    educationLevel: row.education_level,
    domain: row.domain,
    description: row.description,
    remote: row.remote,
    source: row.source,
    status: row.status === 'expired' ? 'expired' : 'active',
    isDemo: row.is_demo === true,
  };
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const secret = Deno.env.get('CRON_SECRET');
  const auth = req.headers.get('Authorization');
  if (!secret || auth !== `Bearer ${secret}`) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Configuration incomplète' }, 500);

  if (!RESEND_API_KEY) return json({ ok: false, error: 'RESEND_API_KEY not set' }, 500);

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: alerts, error: alertsError } = await supabase
    .from('job_alerts')
    .select('id, user_id, label, keywords, location, domain, education_level, contract, remote, source, created_at')
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (alertsError) return json({ error: alertsError.message }, 500);
  if (!alerts?.length) return json({ ok: true, sent: 0, message: 'Aucune alerte active' });

  const userIds = [...new Set(alerts.map((alert) => alert.user_id as string))];
  let usersResult = await supabase
    .from('users')
    .select('id, email, first_name, in_app_notifications_enabled')
    .in('id', userIds);
  if (usersResult.error?.message?.includes('in_app_notifications_enabled')) {
    usersResult = await supabase.from('users').select('id, email, first_name').in('id', userIds);
  }
  const { data: users, error: usersError } = usersResult;
  if (usersError) return json({ error: usersError.message }, 500);

  const usersById = new Map((users ?? []).map((user) => [user.id as string, user]));
  const windowStart = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let sent = 0;

  for (const raw of alerts as AlertRow[]) {
    const user = usersById.get(raw.user_id);
    const email = typeof user?.email === 'string' ? user.email.trim() : '';
    if (!email) continue;

    const criteria = criteriaOf(raw);
    const since = raw.created_at > windowStart ? raw.created_at : windowStart;
    let query = supabase
      .from('job_offers')
      .select('id, title, company_name, location, contract_type, education_level, domain, description, remote, source, status, is_demo')
      .eq('status', 'active')
      .eq('is_demo', false)
      .gte('created_at', since);

    const search = ilikePattern(criteria.keywords);
    if (search) {
      query = query.or(
        `title.ilike.${search},company_name.ilike.${search},description.ilike.${search},domain.ilike.${search}`
      );
    }
    const location = plainSearchTerm(criteria.location);
    if (location) query = query.ilike('location', `%${location}%`);
    if (criteria.domain) query = query.eq('domain', criteria.domain);
    if (criteria.educationLevel) query = query.eq('education_level', criteria.educationLevel);
    if (criteria.source) query = query.eq('source', criteria.source);
    if (criteria.remote === 'yes') query = query.eq('remote', true);
    if (criteria.remote === 'no') query = query.eq('remote', false);
    if (criteria.contract === 'stage') query = query.ilike('contract_type', 'Stage%');
    else if (criteria.contract === 'alternance') query = query.ilike('contract_type', 'Alternance%');
    else query = query.or('contract_type.ilike.Stage*,contract_type.ilike.Alternance*');

    const { data: offerRows, error: offersError } = await query
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT);
    if (offersError) {
      console.error('Lecture offres:', offersError.message);
      continue;
    }

    const offers = (offerRows ?? []) as OfferRow[];
    if (offers.length === 0) continue;

    const { data: delivered, error: deliveredError } = await supabase
      .from('job_alert_deliveries')
      .select('job_offer_id')
      .eq('alert_id', raw.id)
      .in('job_offer_id', offers.map((offer) => offer.id));
    if (deliveredError) {
      console.error('Lecture envois:', deliveredError.message);
      continue;
    }

    const already = new Set((delivered ?? []).map((row) => String(row.job_offer_id)));
    const fresh = offers.filter((offer) => !already.has(offer.id) && offerMatchesAlert(toMatchOffer(offer), criteria));
    if (fresh.length === 0) continue;

    const listed = fresh.slice(0, LISTED_IN_EMAIL);
    const label = raw.label?.trim() || jobAlertLabel(criteria);
    const firstName = typeof user?.first_name === 'string' && user.first_name.trim()
      ? user.first_name.trim()
      : 'Candidat';
    const resultsPath = jobAlertResultsPath(criteria);
    const subject = fresh.length > 1
      ? `${fresh.length} nouvelles offres — ${label}`
      : `Nouvelle offre — ${label}`;

    const items = listed.map((offer) => {
      const place = offer.location ? ` · ${escapeHtml(offer.location)}` : '';
      const href = escapeHtml(appHref(`/offres/${offer.id}`));
      return `<li><a href="${href}"><strong>${escapeHtml(offer.title)}</strong></a> — ${escapeHtml(offer.company_name)}${place}</li>`;
    }).join('');
    const more = fresh.length > listed.length
      ? `<p>Et ${fresh.length - listed.length} autre${fresh.length - listed.length > 1 ? 's' : ''} dans votre recherche.</p>`
      : '';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:20px;color:#333;} a{color:#1d4ed8;} ul{line-height:1.6;}</style></head>
<body>
  <p>Bonjour ${escapeHtml(firstName)},</p>
  <p>${fresh.length > 1 ? `${fresh.length} nouvelles offres correspondent` : 'Une nouvelle offre correspond'} à votre alerte <strong>${escapeHtml(label)}</strong>.</p>
  <ul>${items}</ul>
  ${more}
  <p><a href="${escapeHtml(appHref(resultsPath))}">Voir les offres correspondantes</a></p>
  <p>Pour arrêter ces e-mails, mettez l’alerte en pause dans Offres d’emploi.</p>
  <p>— L’équipe AlternanceTracker</p>
</body>
</html>`;

    const deliveryRows = fresh.map((offer) => ({ alert_id: raw.id, job_offer_id: offer.id }));
    const { error: insertError } = await supabase.from('job_alert_deliveries').insert(deliveryRows);
    if (insertError) {
      console.error('Journal alerte:', insertError.message);
      continue;
    }

    const ok = await sendEmail(email, subject, html);
    if (!ok) {
      await supabase
        .from('job_alert_deliveries')
        .delete()
        .eq('alert_id', raw.id)
        .in('job_offer_id', fresh.map((offer) => offer.id));
      continue;
    }

    sent += 1;
    const inApp = user?.in_app_notifications_enabled !== false;
    if (inApp) {
      const countLabel = fresh.length > 1 ? `${fresh.length} nouvelles offres` : '1 nouvelle offre';
      const { error: notificationError } = await supabase.from('user_notifications').insert({
        user_id: raw.user_id,
        type: 'job_alert',
        title: 'Nouvelles offres',
        body: `${countLabel} pour « ${label} ».`,
        link: resultsPath,
        dedupe_key: `job_alert:${raw.id}:${fresh.map((offer) => offer.id).sort().join(',')}`,
        metadata: { alertId: raw.id, offerIds: fresh.map((offer) => offer.id) },
      });
      if (notificationError) console.error('Notification alerte:', notificationError.message);
    }
  }

  return json({ ok: true, sent });
});
