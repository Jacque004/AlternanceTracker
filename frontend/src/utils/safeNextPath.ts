/** Page interne vers laquelle renvoyer quelqu'un après la connexion. */
export type NextLocation = {
  pathname?: string;
  search?: string;
  hash?: string;
};

const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/confirm-success',
]);

export const POST_LOGIN_PATH_KEY = 'alternancetracker_post_login';

export function safeNextPath(from?: NextLocation | null): string {
  const pathname = from?.pathname ?? '';
  if (
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname.includes('\\') ||
    pathname.includes('://')
  ) {
    return '/';
  }

  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (AUTH_PATHS.has(normalized) || normalized.startsWith('/auth/')) {
    return '/';
  }

  const search = from?.search && from.search.startsWith('?') ? from.search : '';
  const hash = from?.hash && from.hash.startsWith('#') ? from.hash : '';
  return `${pathname}${search}${hash}`;
}

export function safeNextPathFromString(value: string | null | undefined): string {
  if (!value) return '/';
  const hashIndex = value.indexOf('#');
  const hash = hashIndex >= 0 ? value.slice(hashIndex) : '';
  const beforeHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const queryIndex = beforeHash.indexOf('?');
  const pathname = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const search = queryIndex >= 0 ? beforeHash.slice(queryIndex) : '';
  return safeNextPath({ pathname, search, hash });
}

export function rememberPostLoginPath(path: string) {
  try {
    if (!path || path === '/') sessionStorage.removeItem(POST_LOGIN_PATH_KEY);
    else sessionStorage.setItem(POST_LOGIN_PATH_KEY, path);
  } catch {
    // navigation privée : on continue sans mémoriser
  }
}

export function consumePostLoginPath(): string | null {
  try {
    const raw = sessionStorage.getItem(POST_LOGIN_PATH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(POST_LOGIN_PATH_KEY);
    const path = safeNextPathFromString(raw);
    return path === '/' ? null : path;
  } catch {
    return null;
  }
}

export function clearPostLoginPath() {
  try {
    sessionStorage.removeItem(POST_LOGIN_PATH_KEY);
  } catch {
    // ignore
  }
}
