import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { retrieveRawInitData } from '@telegram-apps/sdk-react';
import type { SessionUser } from '@tma-shop/shared';
import { api } from '../api/client.js';

type Status = 'loading' | 'ready' | 'error';

interface SessionValue {
  status: Status;
  user: SessionUser | null;
  error: string | null;
  isAdmin: boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function authenticate(): Promise<void> {
      try {
        const initDataRaw = retrieveRawInitData();
        if (!initDataRaw) throw new Error('Launch the app from Telegram');
        const session = await api.auth(initDataRaw);
        if (cancelled) return;
        api.setToken(session.token);
        setUser(session.user);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    }
    void authenticate();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ status, user, error, isAdmin: user?.role === 'admin' }),
    [status, user, error],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
