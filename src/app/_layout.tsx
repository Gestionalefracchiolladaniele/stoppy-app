import '../global.css';

import * as SplashScreen from 'expo-splash-screen';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useNotificationStore } from '@/features/notifications/notification-store';
import { useAuthStore } from '@/lib/auth-store';
import { maybeCreateDailyNotification } from '@/lib/daily-notification-runner';
import { registerForPushNotifications, savePushToken } from '@/lib/push-notifications';
import { initCache } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

/**
 * On every successful auth, run background bootstrap:
 * - Save push token if notifications enabled
 * - Subscribe to realtime notifications channel
 * - Insert today's daily notification (if not already done)
 */
let realtimeUnsub: (() => void) | null = null;

async function bootstrapUserSession(
  userId: string,
  userName: string | null | undefined,
  notificationsEnabled: boolean | null | undefined,
) {
  // 1) Realtime subscription — live updates to bell badge
  if (realtimeUnsub) realtimeUnsub();
  realtimeUnsub = useNotificationStore.getState().subscribeRealtime(userId);

  // 2) Preload notifications into store
  useNotificationStore.getState().fetchNotifications(userId).catch(() => {});

  // 3) Save Expo push token if notifications opted in
  if (notificationsEnabled !== false) {
    const token = await registerForPushNotifications();
    if (token) {
      await savePushToken(userId, token).catch(() => {});
    }
  }

  // 4) Maybe create today's daily notification (idempotent)
  await maybeCreateDailyNotification(userId, userName);
}

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const isLoading = useAuthStore((s) => s.isLoading);
  const didInit = useRef(false);
  const [cacheReady, setCacheReady] = useState(false);

  useEffect(() => {
    void initCache().then(() => setCacheReady(true));
  }, []);

  useEffect(() => {
    if (!cacheReady) return;

    // Shared session handler — used by both the auth event listener AND a
    // proactive getSession() check on mount. On web, the OAuth redirect reloads
    // the page and Supabase exchanges the ?code= for a session; the resulting
    // event can fire before this subscription attaches (during async cache init),
    // so we don't rely on the event alone — we also pull the session directly.
    let routed = false;
    const handleSession = async (session: import('@supabase/supabase-js').Session | null) => {
      setSession(session);

      if (!session) {
        if (realtimeUnsub) { realtimeUnsub(); realtimeUnsub = null; }
        setUser(null);
        setLoading(false);
        router.replace('/');
        return;
      }

      // Usa maybeSingle: non crasha se 0 righe
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        setUser(profile);
        setLoading(false);

        // Background: bootstrap notifications + push token + daily notification
        bootstrapUserSession(profile.id, profile.name, profile.notifications_enabled).catch(
          (e) => console.warn('[bootstrap] failed:', e),
        );

        router.replace(profile.role_completed ? '/(tabs)/home' : '/onboarding');
        return;
      }

      // Riga non esiste: creala
      const meta = session.user.user_metadata ?? {};
      const { data: created, error } = await supabase
        .from('users')
        .insert({
          id: session.user.id,
          email: session.user.email ?? '',
          name: meta.full_name ?? meta.name ?? session.user.email?.split('@')[0] ?? '',
          avatar_url: meta.avatar_url ?? null,
        })
        .select()
        .maybeSingle();

      // Se 409 conflict, rileggi (la riga esiste ma RLS non la vedeva)
      if (error?.code === '23505') {
        const { data: retry } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        setUser(retry ?? null);
        setLoading(false);
        router.replace(retry?.role_completed ? '/(tabs)/home' : '/onboarding');
        return;
      }

      setUser(created ?? null);
      setLoading(false);
      router.replace('/onboarding');
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' && didInit.current) return;
      if (event === 'INITIAL_SESSION') didInit.current = true;
      if (__DEV__) console.log('[auth] event:', event, 'session:', !!session);
      routed = true;
      await handleSession(session);
    });

    // Proactive check: on web the redirect reload can deliver the session before
    // the listener attaches, so the SIGNED_IN/INITIAL_SESSION event is missed and
    // we'd be stuck on the login screen with a valid session. Pull it directly,
    // and if the OAuth ?code= is still sitting unexchanged in the URL, exchange it.
    void (async () => {
      try {
        if (
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          window.location.search.includes('code=')
        ) {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          if (code) {
            if (__DEV__) console.log('[auth] exchanging OAuth code from URL');
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error && __DEV__) console.warn('[auth] exchange error:', error.message);
            // Strip the code from the URL so a refresh doesn't re-trigger.
            window.history.replaceState({}, '', window.location.origin);
          }
        }
      } catch (e) {
        if (__DEV__) console.warn('[auth] code exchange threw:', e);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (routed) return; // listener already handled it
      if (__DEV__) console.log('[auth] getSession fallback, session:', !!session);
      routed = true;
      void handleSession(session);
    })();

    return () => subscription.unsubscribe();
  }, [cacheReady]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="session" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
