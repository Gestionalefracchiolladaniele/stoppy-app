import type { Mood, CravingMode, Session, DailyMood, PriorSessionSummary, Message } from '@/types';
import { supabase } from './supabase';

export async function fetchSessions(userId: string, limit = 50): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Session[];
}

export async function fetchSession(sessionId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) return null;
  return data as Session;
}

/**
 * Insert a completed session into the DB. Called ONLY when the user fully
 * completes the end-flow (mood-after + recap) or the timer runs out.
 * No DB row exists during the active phase — exits/back-gestures cannot
 * leave orphan rows.
 */
export async function insertCompletedSession(args: {
  user_id: string;
  trigger: string;
  mode: CravingMode;
  mood_before: Mood;
  mood_after: Mood;
  duration: number;
  recap_text: string;
  messages: Message[];
  created_at: string;
  /** Extra per-session metadata (e.g. { balanceRounds }). Stored in the jsonb column. */
  context?: Record<string, unknown>;
}): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: args.user_id,
      trigger: args.trigger,
      mode: args.mode,
      mood_before: args.mood_before,
      mood_after: args.mood_after,
      duration: args.duration,
      recap_text: args.recap_text,
      messages: args.messages,
      created_at: args.created_at,
      context: args.context ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as Session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
  if (error) throw error;
}

export async function fetchPriorSessionSummaries(
  userId: string,
  limit = 5,
): Promise<PriorSessionSummary[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    date: row.created_at.split('T')[0],
    trigger: row.trigger ?? row.food ?? '',
    duration: row.duration,
    mood_before: row.mood_before as Mood,
    summary: row.recap_text?.slice(0, 200) ?? '',
  }));
}

export async function fetchTodaySession(userId: string): Promise<Session | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as Session | null;
}

export async function fetchSessionsByMonth(
  userId: string,
  year: number,
  month: number,
): Promise<Session[]> {
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Session[];
}

export async function fetchStreak(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('sessions')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) return 0;

  const toLocalYmd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const sessionDays = new Set(data.map((s) => toLocalYmd(new Date(s.created_at))));

  const today = new Date();
  const todayStr = toLocalYmd(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = toLocalYmd(yesterday);

  if (!sessionDays.has(todayStr) && !sessionDays.has(yesterdayStr)) return 0;

  let streak = 0;
  const cursor = new Date(today);
  if (!sessionDays.has(todayStr)) cursor.setDate(cursor.getDate() - 1);

  while (sessionDays.has(toLocalYmd(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export async function upsertDailyMood(userId: string, mood: Mood): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('daily_moods')
    .upsert({ user_id: userId, date: today, mood }, { onConflict: 'user_id,date' });

  if (error) throw error;
}

export async function fetchTodayMood(userId: string): Promise<Mood | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_moods')
    .select('mood')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (error || !data) return null;
  return data.mood as Mood;
}

export async function fetchTopFoods(
  userId: string,
  since: string,
  mode?: CravingMode,
): Promise<{ food: string; count: number }[]> {
  let q = supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', since);
  if (mode) q = q.eq('mode', mode);
  const { data, error } = await q;

  if (error || !data) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    const f = (((row as any).trigger ?? (row as any).food) as string)?.trim() || 'urge';
    counts[f] = (counts[f] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([food, count]) => ({ food, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export async function fetchSessionsSince(
  userId: string,
  since: string,
  mode?: CravingMode,
): Promise<Session[]> {
  let q = supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  if (mode) q = q.eq('mode', mode);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Session[];
}

export interface MoodPoint {
  label: string;        // e.g. "Mo", "May 12", "W 3"
  before: number | null;
  after: number | null;
}

export interface TopFood {
  food: string;
  count: number;
}

export interface SessionStats {
  total: number;
  feedCount: number;
  breatheCount: number;
  avgMoodBefore: number | null;
  avgMoodAfter: number | null;
  avgMoodDelta: number | null;
  totalDurationSec: number;
  /** Heatmap weekday × time-of-day (6 buckets: 0-4, 4-8, 8-12, 12-16, 16-20, 20-24). */
  byWeekdayHour: number[][]; // [7][6] — index 0 = Monday, 5 = Saturday, 6 = Sunday
  /** Adaptive mood chart: buckets sized to fit the selected date range. */
  moodSeries: MoodPoint[];
  topFoods: TopFood[];
  /** Average mood delta by time-of-day bucket (6 buckets). null = no data. */
  deltaByHourBucket: (number | null)[];
  /** Best time of day to start a session: bucket with the highest avg mood delta. */
  bestTimeBucket: { label: string; avgDelta: number } | null;
  /** Per-food avg mood before/after/delta — useful to spot which cravings actually lift you. */
  moodByFood: { food: string; count: number; avgBefore: number | null; avgAfter: number | null; delta: number | null }[];
}

/** Time-of-day bucket labels for the heatmap. */
export const HOUR_BUCKETS: { label: string; start: number; end: number }[] = [
  { label: '12a', start: 0, end: 4 },
  { label: '4a', start: 4, end: 8 },
  { label: '8a', start: 8, end: 12 },
  { label: '12p', start: 12, end: 16 },
  { label: '4p', start: 16, end: 20 },
  { label: '8p', start: 20, end: 24 },
];

export const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function dayIndexMonFirst(date: Date): number {
  const dow = date.getDay();
  return dow === 0 ? 6 : dow - 1;
}

function hourBucketIndex(hour: number): number {
  return Math.min(5, Math.floor(hour / 4));
}

/**
 * Build adaptive mood series: divide the [since, now] window into ~7 buckets
 * regardless of the range (1W = 7 days, 2W = 7 buckets of 2d each, 1M = 7 buckets of ~4d each).
 */
function buildMoodSeries(rows: Session[], since: Date, now: Date): MoodPoint[] {
  const spanMs = now.getTime() - since.getTime();
  const BUCKETS = 7;
  const bucketMs = Math.max(spanMs / BUCKETS, 1);

  const before: number[][] = Array.from({ length: BUCKETS }, () => []);
  const after: number[][] = Array.from({ length: BUCKETS }, () => []);

  for (const s of rows) {
    const t = new Date(s.created_at).getTime();
    if (t < since.getTime() || t > now.getTime()) continue;
    const idx = Math.min(BUCKETS - 1, Math.floor((t - since.getTime()) / bucketMs));
    if (s.mood_before) before[idx].push(s.mood_before);
    if (s.mood_after) after[idx].push(s.mood_after);
  }

  const isShortRange = spanMs <= 8 * 24 * 60 * 60 * 1000; // ≤ ~8 days
  const labelFor = (i: number): string => {
    const center = new Date(since.getTime() + bucketMs * (i + 0.5));
    if (isShortRange) {
      // Single-day buckets: weekday letter
      return ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'][dayIndexMonFirst(center)];
    }
    // Multi-day buckets: month/day
    return center.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const avg = (arr: number[]): number | null =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  return Array.from({ length: BUCKETS }, (_, i) => ({
    label: labelFor(i),
    before: avg(before[i]),
    after: avg(after[i]),
  }));
}

export async function fetchSessionStats(
  userId: string,
  since: string,
  mode?: CravingMode,
): Promise<SessionStats> {
  const rows = await fetchSessionsSince(userId, since, mode);

  // weekday × hour bucket heatmap
  const byWeekdayHour: number[][] = Array.from({ length: 7 }, () => Array(6).fill(0));
  const foodCounts: Record<string, number> = {};
  const foodMood: Record<string, { beforeSum: number; beforeN: number; afterSum: number; afterN: number; deltaSum: number; deltaN: number }> = {};
  // For "best time of day" — accumulate deltas per hour bucket
  const bucketDeltas: { sum: number; n: number }[] = Array.from({ length: 6 }, () => ({ sum: 0, n: 0 }));

  let beforeSum = 0, beforeN = 0;
  let afterSum = 0, afterN = 0;
  let deltaSum = 0, deltaN = 0;
  let durSum = 0;
  let feed = 0, breathe = 0;

  for (const s of rows) {
    if (s.mode === 'feed') feed++; else breathe++;
    durSum += s.duration ?? 0;

    // NOTE: mood_before/after now hold URGE INTENSITY (lower = better).
    // Delta is computed `before − after` so a POSITIVE delta = relief = "good"
    // and the existing insights UI (green = positive) reads correctly. (Poof playbook lesson 3.)
    if (s.mood_before) { beforeSum += s.mood_before; beforeN++; }
    if (s.mood_after) { afterSum += s.mood_after; afterN++; }
    if (s.mood_before && s.mood_after) {
      deltaSum += s.mood_before - s.mood_after;
      deltaN++;
    }

    const d = new Date(s.created_at);
    const wdIdx = dayIndexMonFirst(d);
    const hbIdx = hourBucketIndex(d.getHours());
    byWeekdayHour[wdIdx][hbIdx]++;

    if (s.mood_before && s.mood_after) {
      bucketDeltas[hbIdx].sum += s.mood_before - s.mood_after;
      bucketDeltas[hbIdx].n++;
    }

    const food = (((s as any).trigger ?? (s as any).food) ?? '').trim() || (s.mode === 'breathe' ? 'breath' : 'urge');
    foodCounts[food] = (foodCounts[food] ?? 0) + 1;

    if (!foodMood[food]) foodMood[food] = { beforeSum: 0, beforeN: 0, afterSum: 0, afterN: 0, deltaSum: 0, deltaN: 0 };
    const fm = foodMood[food];
    if (s.mood_before) { fm.beforeSum += s.mood_before; fm.beforeN++; }
    if (s.mood_after) { fm.afterSum += s.mood_after; fm.afterN++; }
    if (s.mood_before && s.mood_after) { fm.deltaSum += s.mood_before - s.mood_after; fm.deltaN++; }
  }

  const sinceDate = new Date(since);
  const moodSeries = buildMoodSeries(rows, sinceDate, new Date());

  const topFoods = Object.entries(foodCounts)
    .map(([food, count]) => ({ food, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const deltaByHourBucket = bucketDeltas.map((b) => (b.n ? b.sum / b.n : null));

  // Best time of day: bucket with highest avg delta (require at least 1 session there)
  let bestTimeBucket: SessionStats['bestTimeBucket'] = null;
  let bestDelta = -Infinity;
  for (let i = 0; i < deltaByHourBucket.length; i++) {
    const v = deltaByHourBucket[i];
    if (v !== null && v > bestDelta) {
      bestDelta = v;
      bestTimeBucket = { label: HOUR_BUCKETS[i].label, avgDelta: v };
    }
  }

  const moodByFood = topFoods.map((f) => {
    const fm = foodMood[f.food];
    return {
      food: f.food,
      count: f.count,
      avgBefore: fm.beforeN ? fm.beforeSum / fm.beforeN : null,
      avgAfter: fm.afterN ? fm.afterSum / fm.afterN : null,
      delta: fm.deltaN ? fm.deltaSum / fm.deltaN : null,
    };
  });

  return {
    total: rows.length,
    feedCount: feed,
    breatheCount: breathe,
    avgMoodBefore: beforeN ? beforeSum / beforeN : null,
    avgMoodAfter: afterN ? afterSum / afterN : null,
    avgMoodDelta: deltaN ? deltaSum / deltaN : null,
    totalDurationSec: durSum,
    byWeekdayHour,
    moodSeries,
    topFoods,
    deltaByHourBucket,
    bestTimeBucket,
    moodByFood,
  };
}

/**
 * Clean-streak helpers (post-migration feature scaffolding).
 * `last_relapse_date` on the users row anchors the clean streak.
 */
export async function fetchLastRelapseDate(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('last_relapse_date')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as any).last_relapse_date ?? null;
}

/** Whole days since the last relapse. null = never recorded (treat as day 0 in UI). */
export async function daysSinceRelapse(userId: string): Promise<number | null> {
  const last = await fetchLastRelapseDate(userId);
  if (!last) return null;
  const start = new Date(`${last}T00:00:00`);
  const now = new Date();
  const ms = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

/** Record a relapse (defaults to today, local date) — resets the clean streak. */
export async function markRelapse(userId: string, date?: string): Promise<void> {
  const ymd =
    date ??
    (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
  const { error } = await supabase
    .from('users')
    .update({ last_relapse_date: ymd })
    .eq('id', userId);
  if (error) throw error;
}

export async function fetchMoodHistory(userId: string, days = 30): Promise<DailyMood[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('daily_moods')
    .select('*')
    .eq('user_id', userId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DailyMood[];
}
