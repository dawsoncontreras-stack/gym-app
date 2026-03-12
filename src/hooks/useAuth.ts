import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

/**
 * Hook that initializes auth state on mount and returns current auth state.
 * Call this once at the app root level. The Zustand store can be consumed
 * directly via useAuthStore in child components that just need the state.
 */
export function useAuth() {
  const { session, user, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    const cleanup = initialize();
    return cleanup;
  }, [initialize]);

  return { session, user, isLoading };
}
