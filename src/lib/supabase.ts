import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.',
  );
}

// ---------------------------------------------------------------------------
// SecureStore adapter for Supabase auth persistence
//
// expo-secure-store has a 2048-byte limit per key. Supabase session JWTs can
// exceed that, so we split large values into numbered chunks and store a
// chunk-count header under the original key. Reads reassemble the chunks;
// deletes clean up all of them.
// ---------------------------------------------------------------------------

const CHUNK_SIZE = 2000; // leave headroom under the 2048-byte limit

const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      const header = await SecureStore.getItemAsync(key);
      if (header === null) return null;

      // If the value starts with our chunk marker, reassemble from chunks.
      if (header.startsWith('__chunked:')) {
        const count = parseInt(header.replace('__chunked:', ''), 10);
        const parts: string[] = [];
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
          if (chunk === null) {
            // Corrupted / partial write — treat as missing.
            return null;
          }
          parts.push(chunk);
        }
        return parts.join('');
      }

      // Small value stored directly.
      return header;
    } catch (e) {
      console.warn('[SecureStore] getItem failed:', e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (value.length <= CHUNK_SIZE) {
        // Fits in a single entry — store directly and clean up stale chunks.
        await SecureStore.setItemAsync(key, value);
        await cleanupChunks(key);
        return;
      }

      // Split into chunks.
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }

      // Write chunks first, then the header (acts as a commit marker).
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
      }
      await SecureStore.setItemAsync(key, `__chunked:${chunks.length}`);

      // Remove leftover chunks from a previous write that had more chunks.
      await cleanupChunks(key, chunks.length);
    } catch (e) {
      console.warn('[SecureStore] setItem failed:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      await cleanupChunks(key);
    } catch (e) {
      console.warn('[SecureStore] removeItem failed:', e);
    }
  },
};

/** Remove chunk keys starting from `startAt` (default 0). */
async function cleanupChunks(key: string, startAt = 0): Promise<void> {
  for (let i = startAt; ; i++) {
    const chunkKey = `${key}_chunk_${i}`;
    const existing = await SecureStore.getItemAsync(chunkKey);
    if (existing === null) break;
    await SecureStore.deleteItemAsync(chunkKey);
  }
}

// ---------------------------------------------------------------------------
// Exported helpers so useAuth (or anywhere else) can wipe all auth keys
// without needing to know about the chunking internals.
// ---------------------------------------------------------------------------

/** The storage key Supabase uses for the auth token. */
const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl || 'https://placeholder.supabase.co').hostname.split('.')[0]}-auth-token`;

/** Nuke every SecureStore key that belongs to the Supabase session. */
export async function clearAuthStorage(): Promise<void> {
  await secureStoreAdapter.removeItem(AUTH_STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
