import type { NotificationType } from '@/types';

/**
 * Pre-built notification templates with {placeholder} tokens.
 * Tokens are replaced with real app data at send time.
 *
 * Available tokens:
 *   {name}     — user first name (e.g. "Daniele")
 *   {streak}   — current streak number (e.g. "7")
 *   {days}     — days since last session (e.g. "3")
 *   {topFood}  — most-frequent craving (e.g. "pizza")
 */

interface Template {
  title: string;
  message: string;
}

/** Daily rotating notifications — one per weekday (0=Sun..6=Sat). */
const DAILY_BY_WEEKDAY: Record<number, Template[]> = {
  // Sunday — gentle weekend check-in
  0: [
    { title: '🌊 Sunday check-in', message: "How's the weekend feeling, {name}? A few minutes with me?" },
    { title: '💜 Rest day', message: 'No pressure today. I just wanted to say hi.' },
  ],
  // Monday — motivational kickoff
  1: [
    { title: '✦ Fresh week, {name}', message: 'New week, same Noit. Want to start it with a session?' },
    { title: '🔥 Streak day', message: "You're at {streak} days. Keep the spark going." },
  ],
  // Tuesday — breath suggestion
  2: [
    { title: '🌬️ Just breathe', message: '5 minutes of breath. That\'s all. Want to try?' },
    { title: '💜 Quick pause', message: 'No words needed today — just breath with me?' },
  ],
  // Wednesday — midweek motivation
  3: [
    { title: '✦ Halfway there', message: 'Wednesday hits different. How are you holding up, {name}?' },
    { title: '🌊 Midweek mood', message: "What's been the loudest feeling this week?" },
  ],
  // Thursday — breath suggestion
  4: [
    { title: '🌬️ Breath break', message: 'Thursday tension? Let\'s breathe through it together.' },
    { title: '💜 Slow down', message: 'A few breaths can shift a whole afternoon.' },
  ],
  // Friday — motivation
  5: [
    { title: '🔥 Friday energy', message: '{streak} days strong. The weekend is yours.' },
    { title: '✦ Almost there', message: 'One more day, {name}. Want to check in?' },
  ],
  // Saturday — gentle check-in
  6: [
    { title: '🌊 Weekend with me', message: "Saturday's a good day to slow down. Talk to me?" },
    { title: '💜 No agenda', message: 'Just here whenever you want. No rush.' },
  ],
};

/** Streak milestone templates — keyed by streak day. */
const STREAK_MILESTONES: Record<number, Template> = {
  3: { title: '🔥 3 days!', message: "You showed up 3 days in a row, {name}. That's the spark." },
  7: { title: '✦ One week strong', message: '7 days with me. A real rhythm. Proud of you.' },
  14: { title: '🔥 Two weeks', message: "14 days — this isn't a fluke. This is you." },
  30: { title: '✦ 30 days', message: 'A full month, {name}. You haven\'t needed me as much lately — that\'s the point. 🌿' },
  60: { title: '🔥 Sixty', message: '60 days. The craving knocks less. You opened the door anyway.' },
  100: { title: '✦ One hundred', message: '100 days. I have no words. Just gratitude.' },
};

const STREAK_DAYS = [3, 7, 14, 30, 60, 100];

/** Return-from-inactivity templates (3+ days no session). */
const RETURN_TEMPLATES: Template[] = [
  { title: '🌊 Hey, it\'s been a minute', message: "No pressure, {name} — Noit's here whenever you want." },
  { title: '💜 Still here', message: "It's been {days} days. The door's open." },
  { title: '✦ Missing you', message: 'Whenever you\'re ready. No catch-up needed.' },
];

interface TokenContext {
  name?: string;
  streak?: number;
  days?: number;
  topFood?: string;
}

function applyTokens(template: Template, ctx: TokenContext): Template {
  const tokens: Record<string, string> = {
    '{name}': ctx.name?.split(' ')[0] ?? 'friend',
    '{streak}': String(ctx.streak ?? 0),
    '{days}': String(ctx.days ?? 0),
    '{topFood}': ctx.topFood ?? 'craving',
  };
  const replace = (s: string) =>
    s.replace(/\{name\}|\{streak\}|\{days\}|\{topFood\}/g, (m) => tokens[m] ?? m);
  return { title: replace(template.title), message: replace(template.message) };
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickDailyNotification(ctx: TokenContext): {
  type: NotificationType;
  title: string;
  message: string;
} {
  const weekday = new Date().getDay();
  const pool = DAILY_BY_WEEKDAY[weekday] ?? DAILY_BY_WEEKDAY[0];
  const tpl = pickRandom(pool);
  const filled = applyTokens(tpl, ctx);

  // Tuesday/Thursday = breath suggestion -> session_reminder
  // Mon/Fri = motivation -> session_reminder (with streak)
  // Sun/Wed/Sat = check-in -> daily_check_in
  const type: NotificationType =
    weekday === 0 || weekday === 3 || weekday === 6 ? 'daily_check_in' : 'session_reminder';

  return { type, ...filled };
}

export function pickStreakMilestone(
  streak: number,
  ctx: TokenContext,
): { type: NotificationType; title: string; message: string } | null {
  if (!STREAK_DAYS.includes(streak)) return null;
  const tpl = STREAK_MILESTONES[streak];
  if (!tpl) return null;
  const filled = applyTokens(tpl, { ...ctx, streak });
  return { type: 'streak_milestone', ...filled };
}

export function pickReturnNotification(
  daysInactive: number,
  ctx: TokenContext,
): { type: NotificationType; title: string; message: string } {
  const tpl = pickRandom(RETURN_TEMPLATES);
  const filled = applyTokens(tpl, { ...ctx, days: daysInactive });
  return { type: 'session_reminder', ...filled };
}

export function isStreakMilestone(streak: number): boolean {
  return STREAK_DAYS.includes(streak);
}
