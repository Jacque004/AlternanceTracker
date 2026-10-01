import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { clearPostLoginPath } from './utils/safeNextPath';
import { queryClient } from './query/client';

const authState = vi.hoisted(() => ({
  isAdmin: false,
  session: null as null | {
    expires_at: number;
    user: { id: string; email: string; user_metadata: Record<string, string> };
  },
}));

const profileRow = {
  id: 'user-1',
  email: 'camille@example.com',
  first_name: 'Camille',
  last_name: 'Martin',
  created_at: '2026-01-15T10:00:00.000Z',
  school: null,
  formation: null,
  study_year: null,
  preferred_location: null,
  preferred_domain: null,
  preferred_education_level: null,
  alternance_rhythm: null,
  desired_start_date: null,
  linkedin_url: null,
  avatar_url: null,
  weekly_summary_enabled: false,
  reminder_emails_enabled: true,
  applications_goal: null,
  privacy_policy_accepted_at: '2026-01-15T10:00:00.000Z',
  terms_accepted_at: '2026-01-15T10:00:00.000Z',
  marketing_emails_consent: false,
  in_app_notifications_enabled: true,
};

vi.mock('@react-pdf/renderer', () => ({
  pdf: () => ({ toBlob: async () => new Blob(['pdf']) }),
  Document: ({ children }: { children?: unknown }) => children ?? null,
  Page: ({ children }: { children?: unknown }) => children ?? null,
  Text: ({ children }: { children?: unknown }) => children ?? null,
  View: ({ children }: { children?: unknown }) => children ?? null,
  StyleSheet: { create: (styles: unknown) => styles },
}));

vi.mock('./lib/supabase', () => {
  function builder(table: string) {
    const listResult =
      table === 'users'
        ? { data: profileRow, error: null, count: 1 }
        : { data: [], error: null, count: 0 };
    const singleResult =
      table === 'users' ? { data: profileRow, error: null } : { data: null, error: null };
    let mode: 'list' | 'single' = 'list';
    const api: Record<string, unknown> = {};
    const self = new Proxy(api, {
      get(_target, prop) {
        if (prop === 'then') {
          const result = mode === 'single' ? singleResult : listResult;
          return (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject);
        }
        if (prop === 'single' || prop === 'maybeSingle') {
          return () => {
            mode = 'single';
            return self;
          };
        }
        return () => self;
      },
    });
    return self;
  }

  const channelApi = {
    on: () => channelApi,
    subscribe: () => ({ unsubscribe: () => undefined }),
  };

  return {
    isInvalidRefreshTokenError: () => false,
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: authState.session }, error: null }),
        getUser: async () => ({ data: { user: authState.session?.user ?? null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
        signOut: async () => ({ error: null }),
        refreshSession: async () => ({ data: { session: authState.session }, error: null }),
        signInWithPassword: async () => ({ data: { session: authState.session }, error: null }),
        signUp: async () => ({ data: {}, error: null }),
        signInWithOAuth: async () => ({ data: {}, error: null }),
        resetPasswordForEmail: async () => ({ error: null }),
        updateUser: async () => ({ data: { user: authState.session?.user ?? null }, error: null }),
      },
      from: (table: string) => builder(table),
      rpc: async (name: string) => {
        if (name === 'is_admin') return { data: authState.isAdmin, error: null };
        if (name === 'job_offer_facets') {
          return { data: { domains: [], educationLevels: [], sources: [] }, error: null };
        }
        if (name === 'dashboard_statistics') {
          return {
            data: {
              total: 0,
              statusDistribution: {},
              monthlyData: [],
              applicationsThisWeek: 0,
              relancesThisWeek: 0,
              lettersThisWeek: 0,
            },
            error: null,
          };
        }
        if (name === 'admin_get_stats') {
          return {
            data: {
              usersCount: 1,
              applicationsCount: 0,
              applicationsByStatus: {},
              usersLast7Days: 0,
              applicationsLast7Days: 0,
              monthlyData: [],
              recentUsers: [],
            },
            error: null,
          };
        }
        if (name === 'admin_list_users') return { data: [], error: null };
        return { data: null, error: null };
      },
      channel: () => channelApi,
      removeAllChannels: async () => undefined,
      realtime: { disconnect: () => undefined },
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    },
  };
});

function asGuest() {
  authState.session = null;
  authState.isAdmin = false;
}

function asMember(admin = false) {
  authState.isAdmin = admin;
  authState.session = {
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: 'user-1',
      email: 'camille@example.com',
      user_metadata: { first_name: 'Camille', last_name: 'Martin' },
    },
  };
}

async function go(path: string) {
  await act(async () => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

async function expectPath(pathname: string, hash?: string) {
  await waitFor(() => {
    expect(window.location.pathname).toBe(pathname);
    if (hash !== undefined) expect(window.location.hash).toBe(hash);
  });
}

async function expectHeading(name: RegExp) {
  expect(await screen.findByRole('heading', { level: 1, name }, { timeout: 8000 })).toBeInTheDocument();
}

function clickHref(href: string) {
  const link = screen.getAllByRole('link').find((el) => el.getAttribute('href') === href);
  if (!link) throw new Error(`Lien introuvable : ${href}`);
  fireEvent.click(link);
}

beforeAll(() => {
  window.scrollTo = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
});

beforeEach(() => {
  queryClient.clear();
  localStorage.setItem('alternancetracker_onboarding_done_v2', '1');
  clearPostLoginPath();
});

afterEach(() => {
  cleanup();
  queryClient.clear();
});

describe('routes et redirections', () => {
  it('sert les pages publiques, les liens entre elles et refuse les pages privées', async () => {
    asGuest();
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(
      await screen.findByRole('link', { name: /Créer un compte et tester/i }, { timeout: 8000 })
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toMatch(/Accueil/));

    clickHref('/register');
    await expectPath('/register');
    await expectHeading(/Créer un compte/);

    clickHref('/login');
    await expectPath('/login');
    await expectHeading(/^Connexion$/);
    await waitFor(() => expect(document.title).toMatch(/Connexion/));

    clickHref('/forgot-password');
    await expectPath('/forgot-password');
    await expectHeading(/Mot de passe oublié/);

    clickHref('/login');
    clickHref('/register');
    clickHref('/politique-confidentialite');
    await expectPath('/politique-confidentialite');
    await expectHeading(/Politique de confidentialité/);

    clickHref('/cgu');
    await expectPath('/cgu');
    await expectHeading(/Conditions générales d'utilisation/);

    await go('/reset-password/');
    await waitFor(() => {
      expect(window.location.pathname.replace(/\/+$/, '') || '/').toBe('/reset-password');
    });
    await expectHeading(/Nouveau mot de passe/);

    await go('/auth/confirm-success');
    await expectPath('/auth/confirm-success');
    await expectHeading(/Email confirmé/);
    clickHref('/login');
    await expectHeading(/^Connexion$/);

    await go('/a-propos/');
    await expectPath('/a-propos/');
    await expectHeading(/À propos/);

    for (const path of ['/applications', '/offres', '/preparer', '/calendar', '/profile', '/admin', '/coaching', '/offre/abc']) {
      await go(path);
      await expectPath('/login');
      await expectHeading(/^Connexion$/);
    }

    await go('/page-inconnue');
    await expectPath('/page-inconnue');
    await expectHeading(/Page introuvable/);
    await waitFor(() => expect(document.title).toMatch(/Page introuvable/));
    clickHref('/');
    expect(await screen.findByRole('link', { name: /Créer un compte et tester/i })).toBeInTheDocument();
  }, 30000);

  it('ouvre chaque espace connecté et applique les redirections historiques', async () => {
    asMember(false);
    window.history.pushState({}, '', '/');
    render(<App />);

    await expectHeading(/Tableau de bord/);
    await waitFor(() => expect(document.title).toMatch(/Accueil/));

    clickHref('/applications');
    await expectPath('/applications');
    await expectHeading(/Mes candidatures/);

    clickHref('/applications/new');
    await expectPath('/applications/new');
    await expectHeading(/Nouvelle candidature/);

    await go('/applications/42/edit');
    await expectPath('/applications/42/edit');
    await expectHeading(/Modifier la candidature/);

    clickHref('/offres');
    await expectPath('/offres');
    await expectHeading(/Offres d.emploi/);

    await go('/offre');
    await expectPath('/offres');
    await expectHeading(/Offres d.emploi/);

    await go('/offre/abc-123');
    await expectPath('/offres/abc-123');
    expect(
      await screen.findByRole('heading', { name: /Cette offre n.existe pas/ }, { timeout: 8000 })
    ).toBeInTheDocument();

    clickHref('/calendar');
    await expectPath('/calendar');
    await expectHeading(/^Calendrier$/);

    clickHref('/preparer');
    await expectPath('/preparer/cv');
    await expectHeading(/Préparer ma candidature/);

    clickHref('/preparer/lettres');
    await expectPath('/preparer/lettres');
    await expectHeading(/Modèles de lettres de motivation/);

    clickHref('/preparer/analyser-offre');
    await expectPath('/preparer/analyser-offre');
    await expectHeading(/Analyser une offre d'emploi/);

    clickHref('/preparer/conseils');
    await expectPath('/preparer/conseils');
    await expectHeading(/Coaching alternance/);

    await go('/conseils-cv');
    await expectPath('/preparer/cv');
    await go('/mon-cv');
    await expectPath('/preparer/cv');
    await go('/coaching');
    await expectPath('/preparer/conseils');
    await expectHeading(/Coaching alternance/);
    await go('/modeles-lettres');
    await expectPath('/preparer/lettres');
    await go('/analyser-offre');
    await expectPath('/preparer/analyser-offre');

    await go('/aide/notifications');
    await expectPath('/profile', '#notifications');
    await expectHeading(/Camille Martin/);
    expect(document.getElementById('notifications')).toBeTruthy();

    clickHref('/a-propos');
    await expectPath('/a-propos');
    await expectHeading(/À propos/);

    await go('/admin');
    await expectPath('/');
    await expectHeading(/Tableau de bord/);

    await go('/login');
    await expectPath('/');
    await expectHeading(/Tableau de bord/);

    await go('/register');
    await expectPath('/');
    await expectHeading(/Tableau de bord/);

    await go('/forgot-password');
    await expectPath('/');
    await expectHeading(/Tableau de bord/);

    await go('/reset-password');
    await expectPath('/reset-password');
    await expectHeading(/Nouveau mot de passe/);

    await go('/adresse-inconnue');
    await expectPath('/adresse-inconnue');
    await expectHeading(/Page introuvable/);
  }, 30000);

  it('affiche le panneau admin pour un compte administrateur', async () => {
    asMember(true);
    window.history.pushState({}, '', '/admin');
    render(<App />);

    await expectPath('/admin');
    await expectHeading(/^Administration$/);
    await waitFor(() => expect(document.title).toMatch(/Administration/));
  }, 20000);
});
