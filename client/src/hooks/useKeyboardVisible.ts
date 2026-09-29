import { useEffect, useState } from 'react';

const KEYBOARD_GAP_PX = 120;

function isTextEntry(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el.closest?.('[contenteditable="true"]')) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
    if (['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'color', 'range', 'hidden'].includes(type)) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * True when the soft keyboard is open (visualViewport shrink) or a text field is focused.
 * Used to auto-hide floating chrome (Pomodoro, FAB, bottom nav) on mobile.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const focused = isTextEntry(document.activeElement);
      const vv = window.visualViewport;
      const gap = vv ? Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0)) : 0;
      const keyboardOpen = gap > KEYBOARD_GAP_PX;
      setVisible(focused || keyboardOpen);
    };

    update();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);

    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);

  return visible;
}

export default useKeyboardVisible;
