import { useEffect, useState } from 'react';
import { ApiClientError } from '../api/client.js';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Runs an async loader on mount and whenever a dependency in `deps` changes. */
export function useAsync<T>(loader: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    loader()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.';
        setState({ data: null, loading: false, error: message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
