import { useEffect } from 'react';

/**
 * Lock document scroll while `locked` is true (modals, FAB speed dial, drawers).
 * iOS-safe: freezes body position and restores scrollY on unlock.
 * Pass `allowSelector` to keep nested panels scrollable (e.g. `[data-mobile-drawer-scroll]`).
 */
export function useBodyScrollLock(locked: boolean, allowSelector?: string) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    const onTouchMove = (e: TouchEvent) => {
      if (allowSelector) {
        const target = e.target as Element | null;
        if (target?.closest?.(allowSelector)) return;
      }
      e.preventDefault();
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [locked, allowSelector]);
}

export default useBodyScrollLock;
