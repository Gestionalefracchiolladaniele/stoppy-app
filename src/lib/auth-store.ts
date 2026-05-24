import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import type { SubscriptionStatus, User, UserRole } from '@/types';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;
  signOut: () => Promise<void>;
  hydrateAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,

  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (v) => set({ isLoading: v }),

  signOut: async () => {
    // Clear local store IMMEDIATELY so any subscribers (e.g. tabs gating on user)
    // re-render to the signed-out state without waiting for the auth event.
    set({ session: null, user: null, isLoading: false });
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[signOut] supabase signOut failed:', e);
    }
  },

  hydrateAuth: async () => {
    set({ isLoading: true });
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      set({ session, user: profile ?? null });
    }
    set({ isLoading: false });
  },

  updateUser: async (updates) => {
    const { session } = get();
    if (!session) throw new Error('No active session');

    // Upsert sempre: se la riga non esiste la crea, altrimenti aggiorna
    const meta = session.user.user_metadata ?? {};
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          id: session.user.id,
          email: session.user.email ?? '',
          name: meta.full_name ?? meta.name ?? session.user.email?.split('@')[0] ?? '',
          avatar_url: meta.avatar_url ?? null,
          ...updates,
        },
        { onConflict: 'id' },
      )
      .select()
      .maybeSingle();

    if (error) {
      console.error('[updateUser] ERROR:', error);
      throw new Error(`[${error.code ?? '?'}] ${error.message ?? 'DB error'} — hint: ${error.hint ?? 'none'}`);
    }
    if (!data) throw new Error('No row returned after upsert');
    set({ user: data });
  },
}));

export const useAuth = () =>
  useAuthStore(
    useShallow((s) => ({
      session: s.session,
      user: s.user,
      isLoading: s.isLoading,
      signOut: s.signOut,
    })),
  );

export const useAuthActions = () =>
  useAuthStore(
    useShallow((s) => ({
      setSession: s.setSession,
      setUser: s.setUser,
      hydrateAuth: s.hydrateAuth,
      updateUser: s.updateUser,
    })),
  );

export const useIsOnboarded = (): boolean =>
  useAuthStore((s) => s.user?.role_completed === true);

export const useSubscription = (): SubscriptionStatus =>
  useAuthStore((s) => s.user?.subscription_status ?? 'free');
