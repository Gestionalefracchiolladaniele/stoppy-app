import '../global.css';

import * as SplashScreen from 'expo-splash-screen';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' && didInit.current) return;
      if (event === 'INITIAL_SESSION') didInit.current = true;

      setSession(session);

      if (!session) {
        // Clean up realtime subscription on sign-out
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
    });

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
