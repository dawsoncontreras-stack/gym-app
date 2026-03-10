import { useState, useEffect } from 'react';
import { type Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { createAuthRedirectUrl, extractAuthCode } from '../lib/auth-linking';

// Dismiss the browser window when the redirect URL is received
WebBrowser.maybeCompleteAuthSession();

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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
