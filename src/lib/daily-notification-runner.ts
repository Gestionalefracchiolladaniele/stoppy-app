import { Storage } from './storage';
import {
  pickDailyNotification,
  pickReturnNotification,
} from './notification-templates';
import { insertNotification } from './supabase-notifications';
import { fetchStreak } from './supabase-sessions';
import { supabase } from './supabase';

const LAST_DAILY_KEY = 'noit.last_daily_notif'; // stores YYYY-MM-DD

function todayLocalYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Run on every app open. Creates at most ONE daily notification per local day.
 * - If user has been inactive 3+ days → return notification (priority)
 * - Otherwise → rotating daily by weekday (motivation/breath/check-in)
 *
 * Idempotent: AsyncStorage tracks the last day we inserted, so multiple
 * app opens on the same day don't spam the bell.
 */
export async function maybeCreateDailyNotification(
  userId: string,
  userName: string | null | undefined,
): Promise<void> {
  try {
    const today = todayLocalYmd();
    const lastDay = Storage.getString(LAST_DAILY_KEY);
    if (lastDay === today) return; // already created today

    // Look at the most recent session to detect inactivity
    const { data: recentRows } = await supabase
      .from('sessions')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    let daysInactive = 0;
    if (recentRows && recentRows.length > 0) {
      const lastSessionMs = new Date(recentRows[0].created_at).getTime();
      daysInactive = Math.floor((Date.now() - lastSessionMs) / (1000 * 60 * 60 * 24));
    } else {
      daysInactive = 999; // never had a session — but still send daily intro
    }

    const streak = await fetchStreak(userId).catch(() => 0);
    const ctx = { name: userName ?? 'friend', streak };

    let payload;
    if (daysInactive >= 3 && daysInactive < 999) {
      // Inactive — prioritize a return notification
      payload = pickReturnNotification(daysInactive, ctx);
    } else {
      // Normal day — rotating daily
      payload = pickDailyNotification(ctx);
    }

    await insertNotification({
      user_id: userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: { weekday: new Date().getDay(), daysInactive },
    });

    Storage.set(LAST_DAILY_KEY, today);
  } catch (err) {
    console.warn('[maybeCreateDailyNotification] failed:', err);
  }
}
