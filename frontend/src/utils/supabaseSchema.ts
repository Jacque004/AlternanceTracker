/** Erreur PostgREST : colonne ou table absente (migration non appliquée). */
export function isSupabaseSchemaError(error: { code?: string; message?: string; status?: number } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST205' ||
    error.code === 'PGRST204' ||
    error.code === '42703' ||
    error.code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('in_app_notifications_enabled') ||
    msg.includes('user_notifications') ||
    (error.status === 400 &&
      (msg.includes('column') || msg.includes('relation') || msg.includes('schema')))
  );
}

/** Doublon (ex. notification déjà créée pour cette clé). */
export function isSupabaseConflictError(error: { code?: string; status?: number } | null): boolean {
  if (!error) return false;
  return error.code === '23505' || error.status === 409;
}
