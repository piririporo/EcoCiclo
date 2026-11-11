'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { db } from '@/lib/supabase';

type SessionState = {
  status: 'checking' | 'signed-out' | 'signed-in' | 'unavailable';
  user: User | null;
  recovering: boolean;
};

const initialSession: SessionState = { status: 'checking', user: null, recovering: false };
const recoveryKey = 'ecociclo-password-recovery';

export function useSession() {
  const [session, setSession] = useState(initialSession);

  useEffect(() => {
    const client = db;
    if (!client) {
      setSession({ ...initialSession, status: 'unavailable' });
      return;
    }

    let previousToken: string | undefined;
    let previousUser: string | undefined;
    let revision = 0;
    let timer: ReturnType<typeof setTimeout>;
    let recoveryUser: string | null = null;
    try {
      recoveryUser = sessionStorage.getItem(recoveryKey);
    } catch {
      // The current recovery session can still work with storage disabled.
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY' && next) {
        recoveryUser = next.user.id;
        try {
          sessionStorage.setItem(recoveryKey, recoveryUser);
        } catch {
          // Keep the recovery state in memory for this page.
        }
      }

      if (!next) {
        ++revision;
        clearTimeout(timer);
        previousToken = previousUser = undefined;
        if (event === 'SIGNED_OUT') {
          recoveryUser = null;
          try {
            sessionStorage.removeItem(recoveryKey);
          } catch {
            // Storage may be disabled by the browser.
          }
        }
        setSession({ ...initialSession, status: 'signed-out' });
        return;
      }

      if (next.access_token === previousToken && event !== 'PASSWORD_RECOVERY' && event !== 'USER_UPDATED') return;
      const current = ++revision;
      const recovering = recoveryUser === next.user.id;
      if (previousUser !== next.user.id || event === 'PASSWORD_RECOVERY') {
        setSession({ ...initialSession, recovering });
      }
      previousToken = next.access_token;
      previousUser = next.user.id;
      clearTimeout(timer);

      // Wait for the Auth callback to finish before calling the Auth API.
      timer = setTimeout(async () => {
        const { data, error } = await client.auth.getUser(next.access_token);
        if (current !== revision) return;
        if (data.user && data.user.id === next.user.id && data.user.email_confirmed_at) {
          setSession({ status: 'signed-in', user: data.user, recovering });
        } else {
          const retryable = error && (error.status === 0 || error.status === 429 || (error.status ?? 0) >= 500);
          setSession({ ...initialSession, status: retryable ? 'unavailable' : 'signed-out' });
        }
      }, 0);
    });

    return () => {
      ++revision;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  return session;
}
