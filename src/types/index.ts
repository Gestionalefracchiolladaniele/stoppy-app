export type UserRole = 'user' | 'admin';

export type SubscriptionStatus = 'free' | 'plus' | 'pro';

export type Mood = 1 | 2 | 3 | 4 | 5;

/** Urge intensity for a NoFap session: 1 = barely there, 5 = overwhelming.
 *  Lower-after-than-before means relief, so deltas are computed `before − after`. */
export type Intensity = 1 | 2 | 3 | 4 | 5;

export type CravingMode = 'feed' | 'breathe';

export type StoppyState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'eating'
  | 'happy'
  | 'excited'
  | 'wink'
  | 'curious'
  | 'eyes_closed';

/** @deprecated Legacy alias — Noit (axolotl) became Stoppy (panda). */
export type NoitState = StoppyState;

/** What set off the urge. Replaces Noit's free-text `food`. */
export type Trigger =
  | 'phone'
  | 'night'
  | 'stress'
  | 'boredom'
  | 'loneliness'
  | 'tiredness'
  | 'social'
  | 'habit'
  | 'other';

export type CravingTime = 'morning' | 'afternoon' | 'evening';

export type FeelingTopic =
  | 'anxiety'
  | 'boredom'
  | 'stress'
  | 'tiredness'
  | 'loneliness'
  | 'frustration'
  | 'sadness'
  | 'emptiness'
  | 'restlessness'
  | 'overwhelm';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  role_completed: boolean;
  subscription_status: SubscriptionStatus;
  premium_expires_at: string | null;
  created_at: string;
  notifications_enabled: boolean;
  check_in_time?: string | null;
  birth_year?: number | null;
  craving_time?: CravingTime | null;
  topics?: FeelingTopic[] | null;
  disclaimer_accepted?: boolean;
  push_token?: string | null;
  reminder_presets?: { morning?: string; afternoon?: string; evening?: string } | null;
  /** Last relapse date (YYYY-MM-DD). Drives the clean-streak hero. */
  last_relapse_date?: string | null;
}

export interface Message {
  id: string;
  role: 'user' | 'stoppy';
  text: string;
  timestamp: number;
}

export interface Session {
  id: string;
  user_id: string;
  /** What set off the urge (was Noit's `food`). */
  trigger: string;
  mode: CravingMode;
  duration: number; // in seconds
  /** Urge intensity 1-5 before/after the session (was Noit's mood). Lower-after = relief. */
  mood_before: Mood;
  mood_after: Mood;
  recap_text: string;
  messages: Message[];
  /** Per-session metadata (jsonb), e.g. { balanceRounds }. */
  context?: Record<string, unknown>;
  created_at: string;
}

export interface PriorSessionSummary {
  date: string; // YYYY-MM-DD
  trigger: string;
  duration: number;
  mood_before: Mood;
  summary: string;
}

export interface DailyMood {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  mood: Mood;
  created_at: string;
}

export type NotificationType = 'session_reminder' | 'daily_check_in' | 'streak_milestone';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any> | null;
  created_at: string;
}
