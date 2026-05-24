export type UserRole = 'user' | 'admin';

export type SubscriptionStatus = 'free' | 'plus' | 'pro';

export type Mood = 1 | 2 | 3 | 4 | 5;

export type CravingMode = 'feed' | 'breathe';

export type NoitState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'eating'
  | 'happy'
  | 'excited'
  | 'wink'
  | 'curious'
  | 'eyes_closed';

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
}

export interface Message {
  id: string;
  role: 'user' | 'noit';
  text: string;
  timestamp: number;
}

export interface Session {
  id: string;
  user_id: string;
  food: string;
  mode: CravingMode;
  duration: number; // in seconds
  mood_before: Mood;
  mood_after: Mood;
  recap_text: string;
  messages: Message[];
  created_at: string;
}

export interface PriorSessionSummary {
  date: string; // YYYY-MM-DD
  food: string;
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
