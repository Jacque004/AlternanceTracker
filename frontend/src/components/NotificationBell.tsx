import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNotifications } from '../contexts/NotificationsContext';
import { UserNotification, UserNotificationType } from '../types';

const typeIcon: Record<UserNotificationType, string> = {
  welcome: '👋',
  application_created: '✅',
  weekly_followup: '📅',
};

function DismissButton({ onDismiss, label }: { onDismiss: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDismiss();
      }}
      className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
      aria-label={label}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function NotificationItem({
  notification,
  onRead,
  onDismiss,
  onClose,
}: {
  notification: UserNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}) {
  const isUnread = !notification.readAt;
  const dismissLabel = `Retirer la notification : ${notification.title}`;

  const handleDismiss = () => {
    void onDismiss(notification.id);
  };

  const handleActivate = () => {
    if (isUnread) void onRead(notification.id);
    onClose();
  };

  const content = (
    <>
      <span className="text-lg shrink-0 mt-0.5" aria-hidden>
        {typeIcon[notification.type]}
      </span>
      <div className="min-w-0 flex-1 pr-1">
        <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
          {notification.title}
        </p>
        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notification.body}</p>
        <p className="text-xs text-gray-400 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })}
        </p>
      </div>
    </>
  );

  const rowClass = `flex items-start gap-2 pl-4 py-3 pr-1 transition-colors ${
    isUnread ? 'bg-primary-50/60' : 'hover:bg-gray-50'
  }`;

  if (notification.link) {
    return (
      <div className={rowClass}>
        <Link
          to={notification.link}
          onClick={handleActivate}
          className="flex min-w-0 flex-1 gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset rounded-md"
        >
          {content}
        </Link>
        <DismissButton onDismiss={handleDismiss} label={dismissLabel} />
      </div>
    );
  }

  return (
    <div className={rowClass}>
      <button
        type="button"
        onClick={handleActivate}
        className="flex min-w-0 flex-1 gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset rounded-md"
      >
        {content}
      </button>
      <DismissButton onDismiss={handleDismiss} label={dismissLabel} />
    </div>
  );
}

const NotificationBell = () => {
  const { enabled, notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!enabled) setOpen(false);
  }, [enabled]);

  useEffect(() => {
    if (!open || !enabled) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, enabled]);

  if (!enabled) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
            : 'Notifications'
        }
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed z-50 left-3 right-3 top-[calc(3.5rem+env(safe-area-inset-top,0px))] max-w-[22rem] ml-auto rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[22rem] sm:max-w-[min(22rem,calc(100dvw-2rem))]"
          role="dialog"
          aria-label="Liste des notifications"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-[min(60vh,20rem)] overflow-y-auto overscroll-contain divide-y divide-gray-100">
            {loading && notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 text-center">Chargement…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 text-center">Aucune notification pour le moment.</p>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={markAsRead}
                  onDismiss={dismiss}
                  onClose={() => setOpen(false)}
                />
              ))
            )}
          </div>
          <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/80">
            <Link
              to="/profile#notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Gérer les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
