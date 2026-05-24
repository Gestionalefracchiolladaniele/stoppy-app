import { supabase } from './supabase';

/**
 * Deletes all user-owned data from public tables.
 *
 * NOTE: This does NOT delete the row in `auth.users` — that requires the
 * service_role key (only available server-side). The auth row will remain
 * but orphaned; we recommend a Supabase Edge Function for full deletion
 * in production. For now, the user is signed out and all their PII in
 * `public.*` tables is removed.
 *
 * Cascade: deleting users.id triggers DELETE on sessions, daily_moods,
 * notifications (via ON DELETE CASCADE in the schema).
 */
export async function deleteOwnAccount(userId: string): Promise<void> {
  // Delete in explicit order in case cascade rules are missing.
  // (RLS allows users to delete their own rows.)
  const deletions = await Promise.allSettled([
    supabase.from('sessions').delete().eq('user_id', userId),
    supabase.from('daily_moods').delete().eq('user_id', userId),
    supabase.from('notifications').delete().eq('user_id', userId),
  ]);

  for (const r of deletions) {
    if (r.status === 'rejected') {
      console.warn('[deleteOwnAccount] partial delete failed:', r.reason);
    }
  }

  // Finally delete the user profile row
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) throw error;
}
