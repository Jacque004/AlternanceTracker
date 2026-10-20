import { describe, expect, it } from 'vitest';
import { avatarObjectPath } from './supabaseStorageUrl';

describe('avatarObjectPath', () => {
  it('conserve un chemin de bucket', () => {
    expect(avatarObjectPath('user-1/avatar')).toBe('user-1/avatar');
  });

  it('extrait le chemin d’une ancienne URL publique', () => {
    expect(
      avatarObjectPath(
        'https://abc.supabase.co/storage/v1/object/public/avatars/user-1/avatar'
      )
    ).toBe('user-1/avatar');
  });

  it('laisse une photo Google hors du bucket', () => {
    expect(avatarObjectPath('https://lh3.googleusercontent.com/a/photo')).toBeNull();
  });
});
