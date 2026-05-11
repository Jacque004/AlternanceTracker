import { MutableRefObject, RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.closest('[aria-hidden="true"]')) return false;
    return !el.hasAttribute('disabled');
  });
}

/** Piège le focus dans `containerRef` tant que `active` est vrai. À la fermeture, restaure `restoreRef` sauf si `skipRestoreRef.current` est true (ex. navigation depuis un lien). */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  restoreRef: RefObject<HTMLElement | null>,
  active: boolean,
  skipRestoreRef?: MutableRefObject<boolean>
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = focusableElements(container);
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      const cur = document.activeElement as HTMLElement | null;
      if (!e.shiftKey) {
        if (cur === last) {
          e.preventDefault();
          first.focus();
        }
      } else {
        if (cur === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    const id = requestAnimationFrame(() => {
      const els = focusableElements(container);
      els[0]?.focus();
    });

    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('keydown', handleKeyDown, true);
      const skip = skipRestoreRef?.current === true;
      if (skipRestoreRef) skipRestoreRef.current = false;
      if (!skip) {
        const btn = restoreRef.current;
        if (btn && typeof btn.focus === 'function') {
          btn.focus();
        }
      }
    };
  }, [active, containerRef, restoreRef, skipRestoreRef]);
}
