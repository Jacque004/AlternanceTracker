import { describe, expect, it } from 'vitest';
import { safeNextPath, safeNextPathFromString } from './safeNextPath';

describe('safeNextPath', () => {
  it('conserve une page interne, sa recherche et son ancre', () => {
    expect(
      safeNextPath({ pathname: '/applications', search: '?page=2', hash: '#suite' })
    ).toBe('/applications?page=2#suite');
    expect(safeNextPath({ pathname: '/profile', hash: '#notifications' })).toBe('/profile#notifications');
  });

  it('refuse les cibles externes et les pages d authentification', () => {
    expect(safeNextPath({ pathname: 'https://evil.example' })).toBe('/');
    expect(safeNextPath({ pathname: '//evil.example' })).toBe('/');
    expect(safeNextPath({ pathname: '/\\evil.example' })).toBe('/');
    expect(safeNextPath({ pathname: '/login' })).toBe('/');
    expect(safeNextPath({ pathname: '/reset-password/' })).toBe('/');
    expect(safeNextPath(null)).toBe('/');
  });

  it('relit une adresse mémorisée', () => {
    expect(safeNextPathFromString('/offres/abc?source=mail#top')).toBe('/offres/abc?source=mail#top');
    expect(safeNextPathFromString('https://evil.example/phish')).toBe('/');
  });
});
