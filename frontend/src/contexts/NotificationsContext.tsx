import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { applicationService } from '../services/supabaseService';
import { UserNotification } from '../types';
import { useSupabaseAuth } from './SupabaseAuthContext';

interface NotificationsContextType {
  enabled: boolean;
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

/** Évite deux bootstraps parallèles (React Strict Mode / re-renders). */
let bootstrapInFlight: string | null = null;

/** File d'attente partagée pour ne pas couper un abonnement tout juste recréé. */
let notificationsRealtimeQueue = Promise.resolve();

function enqueueNotificationsRealtime(task: () => Promise<void> | void) {
  notificationsRealtimeQueue = notificationsRealtimeQueue.then(task).catch((error) => {
    console.warn('Notifications realtime:', error);
  });
}

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useSupabaseAuth();
  const enabled = user?.inAppNotificationsEnabled !== false;
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const bootstrapDoneRef = useRef<string | null>(null);
  const userId = user ? String(user.id) : null;

  const refresh = useCallback(async () => {
    if (!user || !enabled) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        notificationService.list(),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, enabled]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const runBootstrap = useCallback(async () => {
    if (!user || !enabled) return;

    const lockId = String(user.id);
    if (bootstrapInFlight === lockId) return;
    bootstrapInFlight = lockId;

    try {
      await notificationService.ensureWelcome(user.firstName);
      const pendingCount = await applicationService.countByStatuses([
        'pending',
        'followed_up',
        'to_apply',
      ]);
      await notificationService.ensureWeeklyFollowUp(pendingCount);
    } catch (e) {
      console.warn('Bootstrap notifications:', e);
    } finally {
      if (bootstrapInFlight === lockId) bootstrapInFlight = null;
    }
  }, [user, enabled]);

  useEffect(() => {
    if (!user) {
      bootstrapDoneRef.current = null;
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (!enabled) {
      bootstrapDoneRef.current = null;
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const userId = String(user.id);
    const bootstrapKey = `${userId}:${enabled}`;
    if (bootstrapDoneRef.current === bootstrapKey) return;
    bootstrapDoneRef.current = bootstrapKey;

    (async () => {
      await runBootstrap();
      await refresh();
    })();
  }, [user, enabled, runBootstrap, refresh]);

  useEffect(() => {
    if (!userId || !enabled) return;

    let stopped = false;
    let paused = false;
    let generation = 0;

    const subscribe = () => {
      const id = ++generation;
      supabase
        .channel(`user_notifications:${userId}:${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void refreshRef.current();
          }
        )
        .subscribe();
    };

    // Chrome gèle la page (cache arrière) ou le réseau tombe : le client Realtime
    // rouvrirait le WebSocket en boucle. On coupe tout de suite, puis on réabonne au retour.
    const pause = () => {
      if (paused) return;
      paused = true;
      supabase.realtime.disconnect();
      enqueueNotificationsRealtime(async () => {
        await supabase.removeAllChannels();
      });
    };

    const resume = () => {
      if (!paused || stopped) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      paused = false;
      enqueueNotificationsRealtime(() => {
        if (paused || stopped) return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          paused = true;
          return;
        }
        subscribe();
      });
    };

    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted) pause();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resume();
    };

    const listen = (type: string, listener: EventListener) => {
      window.addEventListener(type, listener);
      return () => window.removeEventListener(type, listener);
    };

    enqueueNotificationsRealtime(() => {
      if (!paused && !stopped) subscribe();
    });

    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    const removeFreeze = listen('freeze', pause);
    const removeResume = listen('resume', resume);
    window.addEventListener('offline', pause);
    window.addEventListener('online', resume);

    return () => {
      stopped = true;
      paused = true;
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      removeFreeze();
      removeResume();
      window.removeEventListener('offline', pause);
      window.removeEventListener('online', resume);
      enqueueNotificationsRealtime(async () => {
        supabase.realtime.disconnect();
        await supabase.removeAllChannels();
      });
    };
  }, [userId, enabled]);

  const markAsRead = useCallback(
    async (id: string) => {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    await notificationService.markAllAsRead();
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    setUnreadCount(0);
  }, []);

  const dismiss = useCallback(async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    try {
      await notificationService.remove(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.readAt) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (e) {
      console.error(e);
    }
  }, [notifications]);

  return (
    <NotificationsContext.Provider
      value={{ enabled, notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead, dismiss }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

const notificationsFallback = {
  enabled: false,
  notifications: [] as UserNotification[],
  unreadCount: 0,
  loading: false,
  refresh: async () => {},
  markAsRead: async (_id: string) => {},
  markAllAsRead: async () => {},
  dismiss: async (_id: string) => {},
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  return ctx ?? notificationsFallback;
};
