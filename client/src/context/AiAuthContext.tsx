import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { IS_DEMO, DEMO_USER } from '../lib/demo';
import { useProfile } from './ProfileContext';
import { AiAuthLockModal } from '../components/AiAuthLockModal';

interface AiAuthContextValue {
  /** True when cloud AI / uploads are allowed for this viewer. */
  allowed: boolean;
  /**
   * Returns true if the action may proceed. If blocked, opens the lock modal
   * and returns false — call at the top of AI entry points.
   */
  requireAiAuth: () => boolean;
  openLock: () => void;
  closeLock: () => void;
}

const AiAuthContext = createContext<AiAuthContextValue | undefined>(undefined);

function resolveAdminUid(): string {
  return String(import.meta.env.VITE_ADMIN_UID || '').trim();
}

/**
 * AI Feature Auth Guard — live-demo guests (IS_DEMO / unauthenticated) cannot
 * trigger cloud generation. Signed-in users and the configured admin UID can.
 */
export const AiAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useProfile();
  const [userId, setUserId] = useState<string | null>(() => profile?.id ?? null);
  const [lockOpen, setLockOpen] = useState(false);

  useEffect(() => {
    if (IS_DEMO) {
      setUserId(DEMO_USER.id);
      return;
    }

    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setUserId(data.session?.user?.id ?? null);
      })
      .catch(() => {
        if (mounted) setUserId(null);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (profile?.id) setUserId(profile.id);
  }, [profile?.id]);

  const allowed = useMemo(() => {
    const adminUid = resolveAdminUid();
    const id = userId || profile?.id || null;
    if (adminUid && id === adminUid) return true;
    if (IS_DEMO) return false;
    if (!id || id === DEMO_USER.id) return false;
    return true;
  }, [userId, profile?.id]);

  const openLock = useCallback(() => setLockOpen(true), []);
  const closeLock = useCallback(() => setLockOpen(false), []);

  const requireAiAuth = useCallback(() => {
    if (allowed) return true;
    setLockOpen(true);
    return false;
  }, [allowed]);

  const value = useMemo(
    () => ({ allowed, requireAiAuth, openLock, closeLock }),
    [allowed, requireAiAuth, openLock, closeLock]
  );

  return (
    <AiAuthContext.Provider value={value}>
      {children}
      <AiAuthLockModal open={lockOpen} onClose={closeLock} />
    </AiAuthContext.Provider>
  );
};

export function useAiAuth(): AiAuthContextValue {
  const ctx = useContext(AiAuthContext);
  if (!ctx) {
    // Safe fallback so a missing provider never crashes AI surfaces
    return {
      allowed: false,
      requireAiAuth: () => false,
      openLock: () => {},
      closeLock: () => {},
    };
  }
  return ctx;
}

export default AiAuthProvider;
