import { useState, useEffect } from 'react';
import { type Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase, clearAuthStorage } from '../lib/supabase';
import { createAuthRedirectUrl, extractAuthCode } from '../lib/auth-linking';

// Dismiss the browser window when the redirect URL is received
WebBrowser.maybeCompleteAuthSession();

// ---------------------------------------------------------------------------
// Helpers for detecting and recovering from corrupted / expired sessions.
//
// If the stored token can't be refreshed (403, user deleted, invalid claims)
// we nuke the SecureStore keys and sign out so the user lands on the login
// screen instead of getting stuck in a broken logged-in state.
// ---------------------------------------------------------------------------

/** Patterns that indicate an unrecoverable auth error. */
const FATAL_AUTH_PATTERNS = [
  'invalid claim',
  'user not found',
  'refresh_token_not_found',
  'invalid refresh token',
];

function isFatalAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const msg = ('message' in err ? String((err as { message: unknown }).message) : '').toLowerCase();
  const status = 'status' in err ? (err as { status: unknown }).status : undefined;
  if (status === 403) return true;
  return FATAL_AUTH_PATTERNS.some((p) => msg.includes(p));
}

async function nukeSession(): Promise<void> {
  await clearAuthStorage();
  try {
    await supabase.auth.signOut();
  } catch {
    // signOut may throw on an already-dead session — ignore.
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ── Startup: rehydrate stored session ───────────────────
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        // If the stored session is corrupt or the token refresh failed
        // on startup, wipe everything and fall through with null session.
        if (error && isFatalAuthError(error)) {
          console.warn('[auth] Corrupt session on startup — clearing:', error.message);
          await nukeSession();
          setSession(null);
          setLoading(false);
          return;
        }

        setSession(session);
      } catch (e) {
        // Unexpected throw (SecureStore read failure, JSON parse, etc.)
        console.warn('[auth] getSession threw — clearing session:', e);
        await nukeSession();
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // ── Ongoing: listen for auth state changes ──────────────
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // TOKEN_REFRESHED with a null session means the refresh failed
      // silently (e.g. user deleted server-side, token revoked).
      if (event === 'TOKEN_REFRESHED' && !newSession) {
        console.warn('[auth] Token refresh returned null session — clearing');
        await nukeSession();
        setSession(null);
        return;
      }

      setSession(newSession);
    });

    // Handle incoming deep links (email confirmation, OAuth redirects)
    const handleDeepLink = async (event: { url: string }) => {
      const code = extractAuthCode(event.url);
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
    };

    // Cold start: app opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Warm start: app already running when deep link arrives
    const linkSubscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    // OTP mode: Supabase sends a 6-digit code instead of a magic link.
    // Enable in dashboard: Authentication > Settings > Email OTP, set expiry to 300s (5 min).
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const verifySignUpOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const redirectTo = createAuthRedirectUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (!data.url) throw new Error('No OAuth URL returned');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === 'success' && result.url) {
      const code = extractAuthCode(result.url);
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    session,
    loading,
    signUp,
    verifySignUpOtp,
    signIn,
    signOut,
    signInWithGoogle,
  };
}
