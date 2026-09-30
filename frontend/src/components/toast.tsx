import { useSyncExternalStore } from 'react';

type ToastType = 'blank' | 'success' | 'error' | 'loading';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastOptions {
  id?: string;
  duration?: number;
}

type ToastFn = {
  (message: string, options?: ToastOptions): string;
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  loading: (message: string, options?: ToastOptions) => string;
};

const DEFAULT_DURATION = 4200;
const ERROR_DURATION = 5500;

const listeners = new Set<() => void>();
const timers = new Map<string, number>();
let toasts: ToastItem[] = [];
let sequence = 0;

function emit() {
  listeners.forEach((listener) => listener());
}

function dismiss(id: string) {
  const timer = timers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  if (!toasts.some((item) => item.id === id)) return;
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

function schedule(item: ToastItem) {
  const existing = timers.get(item.id);
  if (existing !== undefined) {
    window.clearTimeout(existing);
    timers.delete(item.id);
  }
  if (!Number.isFinite(item.duration)) return;
  const timer = window.setTimeout(() => dismiss(item.id), item.duration);
  timers.set(item.id, timer);
}

function push(message: string, type: ToastType, options?: ToastOptions): string {
  const id = options?.id ?? `toast-${++sequence}`;
  const duration =
    options?.duration ??
    (type === 'error' ? ERROR_DURATION : type === 'loading' ? Number.POSITIVE_INFINITY : DEFAULT_DURATION);
  const next: ToastItem = { id, message, type, duration };
  const index = toasts.findIndex((item) => item.id === id);
  toasts = index === -1 ? [...toasts, next] : toasts.map((item) => (item.id === id ? next : item));
  schedule(next);
  emit();
  return id;
}

const toast: ToastFn = (message, options) => push(message, 'blank', options);
toast.success = (message, options) => push(message, 'success', options);
toast.error = (message, options) => push(message, 'error', options);
toast.loading = (message, options) => push(message, 'loading', options);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (items.length === 0) return null;

  return (
    <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
      {items.map((item) => (
        <div key={item.id} className={`toast toast-${item.type}`} role="status">
          {item.message}
        </div>
      ))}
    </div>
  );
}

export default toast;
