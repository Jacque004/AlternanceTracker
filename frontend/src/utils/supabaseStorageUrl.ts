/**
 * URLs publiques Storage Supabase : …/storage/v1/object/public/{bucket}/…
 * Certaines anciennes valeurs avaient …/object/{bucket}/… (sans `public`) → erreur 400 au GET.
 */
export function normalizeSupabaseAvatarPublicUrl(url: string | null | undefined): string | null {
  if (url == null || typeof url !== 'string') return null;
  const u = url.trim();
  if (u === '') return null;
  if (!u.includes('/storage/v1/object/avatars/')) return u;
  if (u.includes('/storage/v1/object/public/avatars/')) return u;
  return u.replace('/storage/v1/object/avatars/', '/storage/v1/object/public/avatars/');
}
