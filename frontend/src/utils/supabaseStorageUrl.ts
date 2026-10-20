import { supabase } from '../lib/supabase';

const AVATAR_BUCKET = 'avatars';
/** Lien temporaire : la photo n’est plus servie par une URL publique permanente. */
const AVATAR_SIGNED_URL_SECONDS = 60 * 60 * 12;

/**
 * Anciennes URL publiques Storage : …/storage/v1/object/public/avatars/…
 * ou …/object/avatars/… sans le segment public.
 * La valeur récente est le chemin `{userId}/avatar`.
 * Une URL externe (photo Google) n’a pas de chemin Storage.
 */
export function avatarObjectPath(stored: string | null | undefined): string | null {
  if (stored == null || typeof stored !== 'string') return null;
  const value = stored.trim();
  if (value === '') return null;
  if (!value.includes('://')) {
    return value.replace(/^\/+/, '').replace(/^avatars\//, '');
  }
  const match = value.match(/\/storage\/v1\/object\/(?:public\/)?avatars\/([^?#]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Affiche une photo Google telle quelle, ou signe le fichier du bucket privé. */
export async function resolveAvatarDisplayUrl(stored: string | null | undefined): Promise<string | null> {
  if (stored == null || typeof stored !== 'string' || stored.trim() === '') return null;
  const path = avatarObjectPath(stored);
  if (!path) return stored.trim();
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
