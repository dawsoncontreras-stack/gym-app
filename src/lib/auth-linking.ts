import * as Linking from 'expo-linking';

/**
 * Creates the redirect URL for auth callbacks (email confirmation, OAuth).
 * In Expo Go: exp://127.0.0.1:8081/--/auth/callback
 * In production: gymapp://auth/callback
 */
export function createAuthRedirectUrl(): string {
  return Linking.createURL('auth/callback');
}

/**
 * Extracts the PKCE auth code from a deep link URL.
 * Supabase PKCE flow returns a `code` query parameter after verification.
 */
export function extractAuthCode(url: string): string | undefined {
  const parsed = Linking.parse(url);
  return (parsed.queryParams?.code as string) ?? undefined;
}
