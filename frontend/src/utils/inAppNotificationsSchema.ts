/** Cache : colonne `in_app_notifications_enabled` absente (migration 020 non appliquée). */
let columnMissing: boolean | null = null;

export function isInAppNotificationsColumnMissing(): boolean {
  return columnMissing === true;
}

export function markInAppNotificationsColumnMissing(): void {
  columnMissing = true;
}

export function markInAppNotificationsColumnPresent(): void {
  columnMissing = false;
}
