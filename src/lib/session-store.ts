import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import type { CravingMode, Message, Mood, NoitState, PriorSessionSummary, Session } from '@/types';
import { generateRecap, streamConversation, checkCrisis, interpretBreatheReflection } from './gemini';
import { pickStreakMilestone, isStreakMilestone } from './notification-templates';
import { insertNotification } from './supabase-notifications';
import {
  fetchPriorSessionSummaries,
  insertCompletedSession,
  fetchTodaySession,
  fetchSessions,
  fetchStreak,
} from './supabase-sessions';

export const CRISIS_MESSAGE =
  "I hear you. This is beyond what I can hold for you right now — please reach out to someone who can really help.\n\nCrisis Text Line: text HOME to 741741 (US) or visit crisistextline.org";

interface SessionState {
  activeSession: Session | null;
  messages: Message[];
  priorSessions: PriorSessionSummary[];
  noitState: NoitState;
  isStreaming: boolean;
  isCrisis: boolean;
  streak: number;
  todaySession: Session | null;
  recentSessions: Session[];

  startSession: (args: { userId: string; food: string; mode: CravingMode; mood_before: Mood }) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  endSession: (mood_after: Mood) => Promise<void>;
  endBreatheSession: (mood_after: Mood, reflection: string) => Promise<void>;
  discardActiveSession: () => Promise<void>;
  loadStreak: (userId: string) => Promise<void>;
  loadTodaySession: (userId: string) => Promise<void>;
  loadRecentSessions: (userId: string) => Promise<void>;
  setNoitState: (state: NoitState) => void;
  reset: () => void;
}



let abortController: AbortController | null = null;

// Stable unique ID for messages — avoids collisions when two messages
// are created in the same millisecond (Date.now() race condition).
let msgCounter = 0;
function newMsgId(): string {
  msgCounter = (msgCounter + 1) % 1_000_000;
  return `${Date.now()}-${msgCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  messages: [],
  priorSessions: [],
  noitState: 'idle',
  isStreaming: false,
  isCrisis: false,
  streak: 0,
  todaySession: null,
  recentSessions: [],

  startSession: async ({ userId, food, mode, mood_before }) => {
    // NO DB INSERT here — session lives in memory only until fully completed.
    // This guarantees zero orphan rows: any exit (back gesture, app kill, modal exit)
    // simply drops the in-memory session without leaving DB residue.
    const prior = await fetchPriorSessionSummaries(userId, 3);

    const localSession: Session = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: userId,
      food,
      mode,
      mood_before,
      mood_after: mood_before,
      duration: 0,
      recap_text: '',
      messages: [],
      created_at: new Date().toISOString(),
    } as Session;

    const openingMsg: Message = {
      id: newMsgId(),
      role: 'noit',
      text: `Hey! I see you're craving ${food} right now. I've got you. What's going on? 🌊`,
      timestamp: Date.now(),
    };

    set({
      activeSession: localSession,
      messages: [openingMsg],
      priorSessions: prior,
      noitState: mode === 'feed' ? 'listening' : 'idle',
      isStreaming: false,
      isCrisis: false,
    });
  },

  sendMessage: async (text: string) => {
    const { activeSession, messages, priorSessions } = get();
    if (!activeSession || get().isStreaming) return;

    if (checkCrisis(text)) {
      set({ isCrisis: true });
      return;
    }

    const userMsg: Message = { id: newMsgId(), role: 'user', text, timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    set({ messages: updatedMessages, noitState: 'thinking', isStreaming: true });

    abortController?.abort();
    abortController = new AbortController();

    let accumulated = '';
    const noitMsgId = newMsgId();

    set((s) => ({
      messages: [...s.messages, { id: noitMsgId, role: 'noit', text: '', timestamp: Date.now() }],
    }));

    await streamConversation(
      {
        food: activeSession.food,
        mode: activeSession.mode,
        mood_before: activeSession.mood_before,
        prior_sessions: priorSessions,
        messages: updatedMessages.map((m) => ({ role: m.role, text: m.text })),
      },
      (chunk) => {
        accumulated += chunk;
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === noitMsgId ? { ...m, text: accumulated } : m,
          ),
          noitState: 'listening',
        }));
      },
      (finalCleanText) => {
        // Replace the visible message with the cleaned final text if provided
        // (drops dangling commas, half-sentences, etc.)
        if (finalCleanText && finalCleanText !== accumulated.trim()) {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === noitMsgId ? { ...m, text: finalCleanText } : m,
            ),
          }));
        }
        set({ isStreaming: false, noitState: 'listening' });
      },
      abortController.signal,
    );
  },

  endSession: async (mood_after: Mood) => {
    const { activeSession, messages } = get();
    if (!activeSession) return;

    set({ noitState: 'eating', isStreaming: true });

    const duration = Math.floor((Date.now() - new Date(activeSession.created_at).getTime()) / 1000);
    const recap = await generateRecap({
      food: activeSession.food,
      mode: activeSession.mode,
      mood_before: activeSession.mood_before,
      mood_after,
      messages: messages.map((m) => ({ role: m.role, text: m.text })),
    });

    // Persist NOW — first time this session touches the DB.
    const finalized = await insertCompletedSession({
      user_id: activeSession.user_id,
      food: activeSession.food,
      mode: activeSession.mode,
      mood_before: activeSession.mood_before,
      mood_after,
      duration,
      recap_text: recap,
      messages: [],
      created_at: activeSession.created_at,
    });

    set({
      activeSession: finalized,
      todaySession: finalized,
      noitState: 'happy',
      isStreaming: false,
    });
  },

  endBreatheSession: async (mood_after: Mood, reflection: string) => {
    const { activeSession, messages } = get();
    if (!activeSession) return;

    set({ noitState: 'happy', isStreaming: true });

    const duration = Math.floor((Date.now() - new Date(activeSession.created_at).getTime()) / 1000);
    const recap = await interpretBreatheReflection({
      food: activeSession.food,
      mood_before: activeSession.mood_before,
      mood_after,
      reflection,
    });

    // Persist NOW — first time this session touches the DB.
    const finalized = await insertCompletedSession({
      user_id: activeSession.user_id,
      food: activeSession.food,
      mode: activeSession.mode,
      mood_before: activeSession.mood_before,
      mood_after,
      duration,
      recap_text: recap,
      messages: [],
      created_at: activeSession.created_at,
    });

    set({
      activeSession: finalized,
      todaySession: finalized,
      noitState: 'happy',
      isStreaming: false,
    });
  },

  loadStreak: async (userId: string) => {
    const prevStreak = get().streak;
    const streak = await fetchStreak(userId);
    set({ streak });
    // Trigger milestone notification ONLY when streak increased to a milestone
    // (prevents re-triggering on every app open)
    if (streak > prevStreak && isStreakMilestone(streak)) {
      const tpl = pickStreakMilestone(streak, { streak });
      if (tpl) {
        insertNotification({
          user_id: userId,
          type: tpl.type,
          title: tpl.title,
          message: tpl.message,
          data: { streak },
        }).catch((e) => console.warn('[loadStreak] milestone notif failed:', e));
      }
    }
  },

  loadTodaySession: async (userId: string) => {
    const session = await fetchTodaySession(userId);
    set({ todaySession: session });
  },

  loadRecentSessions: async (userId: string) => {
    const sessions = await fetchSessions(userId, 20);
    set({ recentSessions: sessions });
  },

  setNoitState: (noitState) => set({ noitState }),

  discardActiveSession: async () => {
    // Session lives in memory only until endSession/endBreatheSession.
    // Discarding is just a state reset — no DB cleanup needed.
    abortController?.abort();
    abortController = null;
    set({
      activeSession: null,
      messages: [],
      priorSessions: [],
      noitState: 'idle',
      isStreaming: false,
      isCrisis: false,
    });
  },

  reset: () => {
    abortController?.abort();
    abortController = null;
    set({
      activeSession: null,
      messages: [],
      priorSessions: [],
      noitState: 'idle',
      isStreaming: false,
      isCrisis: false,
    });
  },
}));

export const useActiveSession = () =>
  useSessionStore(
    useShallow((s) => ({
      session: s.activeSession,
      messages: s.messages,
      noitState: s.noitState,
      isStreaming: s.isStreaming,
      isCrisis: s.isCrisis,
      sendMessage: s.sendMessage,
      endSession: s.endSession,
      endBreatheSession: s.endBreatheSession,
      discardActiveSession: s.discardActiveSession,
      setNoitState: s.setNoitState,
      reset: s.reset,
    })),
  );

export const useNoit = () =>
  useSessionStore(
    useShallow((s) => ({
      state: s.noitState,
      setState: s.setNoitState,
    })),
  );

export const useNoitState = () => useSessionStore((s) => s.noitState);

export const useStreak = () => useSessionStore((s) => s.streak);

export const useTodaySession = () => useSessionStore((s) => s.todaySession);

export const useRecentSessions = () => useSessionStore((s) => s.recentSessions);
