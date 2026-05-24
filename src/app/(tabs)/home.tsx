import { router, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Noit } from '@/components/Noit';
import { PurpleBg } from '@/components/PurpleBg';
import { TabBar } from '@/components/TabBar';
import { TodayMoodDisplay } from '@/components/TodayMoodDisplay';
import { useAuthStore } from '@/lib/auth-store';
import { formatDuration } from '@/lib/format';
import {
  useRecentSessions,
  useSessionStore,
  useStreak,
  useTodaySession,
} from '@/lib/session-store';
import { useSyncPulse } from '@/lib/use-pulse';
import type { Session } from '@/types';

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function chipForMood(after: number | null) {
  if (after === null) return { bg: '#FFF5E6', color: '#7A5010', label: 'Mixed' };
  if (after >= 4) return { bg: '#E6FAF0', color: '#1A6B44', label: 'Good' };
  if (after >= 3) return { bg: '#FFF5E6', color: '#7A5010', label: 'Mixed' };
  return { bg: '#FFE6F0', color: '#8A1840', label: 'Hard' };
}

function moodLabel(m: number | null | undefined) {
  if (!m) return '—';
  if (m >= 4) return 'Good';
  if (m === 3) return 'OK';
  return 'Low';
}

// All PulseCard instances share the exact same sharedScale — perfectly in sync
function PulseCard({ style, children }: { style?: any; children: React.ReactNode }) {
  const scale = useSyncPulse();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

export default function HomeScreen() {
  const name = useAuthStore((s) => s.user?.name ?? 'friend');
  const userId = useAuthStore((s) => s.user?.id);
  const firstName = name.split(' ')[0];
  const streak = useStreak();
  const todaySession = useTodaySession();
  const recent = useRecentSessions();
  const { loadStreak, loadTodaySession, loadRecentSessions } = useSessionStore.getState();

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      loadStreak(userId).catch(console.error);
      loadTodaySession(userId).catch(console.error);
      loadRecentSessions(userId).catch(console.error);
    }, [userId]),
  );

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const totalSessions = recent.length;
  const avgMoodNum = recent.length
    ? Math.round(recent.reduce((acc, s) => acc + (s.mood_after ?? 0), 0) / recent.length)
    : null;

  const weekHeights = computeWeekHeights(recent);

  return (
    <View style={styles.screen}>
      <PurpleBg />

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateStr}>{dateStr}</Text>
          <Text style={styles.greet}>
            {greeting}, {firstName} ✦
          </Text>
        </View>

        {/* Check-in card — pulse */}
        <PulseCard style={styles.checkin}>
          <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => router.push('/session')}>
            <View style={styles.ciLeft}>
              <View style={styles.ciTag}>
                <Text style={styles.ciTagText}>Today</Text>
              </View>
              <Text style={styles.ciTitle}>
                {todaySession ? 'Session done ✓' : 'Ready for your\ndaily session?'}
              </Text>
              <Text style={styles.ciSub}>
                {todaySession ? 'Tap to start another' : '~10 min · Noit is waiting'}
              </Text>
              <View style={styles.ciBtn}>
                <Text style={styles.ciBtnText}>
                  {todaySession ? 'New session' : 'Start session'}
                </Text>
              </View>
            </View>
            <Noit state={todaySession ? 'happy' : 'idle'} size={88} glow={false} />
          </Pressable>
        </PulseCard>

        {/* Last session's mood — read-only display */}
        <PulseCard style={styles.moodCheckinWrap}>
          <TodayMoodDisplay />
        </PulseCard>

        {/* Streak cards — pulse */}
        <Text style={styles.secTitle}>Your streak</Text>
        <View style={styles.streakRow}>
          <PulseCard style={styles.streakCard}>
            <Text style={styles.sv}>{streak} 🔥</Text>
            <Text style={styles.sl}>Day streak</Text>
          </PulseCard>
          <PulseCard style={styles.streakCard}>
            <Text style={[styles.sv, { color: '#5C3E9C' }]}>{totalSessions}</Text>
            <Text style={styles.sl}>Sessions total</Text>
          </PulseCard>
          <PulseCard style={styles.streakCard}>
            <Text style={[styles.sv, { fontSize: 20 }]}>{moodLabel(avgMoodNum)}</Text>
            <Text style={styles.sl}>Avg. mood</Text>
          </PulseCard>
        </View>

        {/* Week bars */}
        <Text style={styles.secTitle}>This week</Text>
        <PulseCard style={styles.weekCard}>
          <View style={styles.weekRow}>
            {DAYS.map((d, i) => {
              const isNow = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
              const h = weekHeights[i] || 0;
              return (
                <View key={d} style={styles.wd}>
                  {h === 0 ? (
                    <View style={[styles.wb, { height: 20, backgroundColor: 'rgba(92,62,156,0.22)' }]} />
                  ) : (
                    <View style={[styles.wb, { height: Math.max(h, 10), backgroundColor: '#5C3E9C' }]} />
                  )}
                  <Text style={[styles.wl, isNow && { color: '#5C3E9C', fontWeight: '700' }]}>{d}</Text>
                </View>
              );
            })}
          </View>
        </PulseCard>

        {/* Recent sessions */}
        <Text style={styles.secTitle}>Recent sessions</Text>
        <PulseCard style={styles.recentCard}>
          {recent.slice(0, 5).map((s, i) => {
            const d = new Date(s.created_at);
            const day = d.getDate();
            const lbl = d.toLocaleDateString('en-US', { weekday: 'short' });
            const cs = chipForMood(s.mood_after ?? null);
            return (
              <View key={s.id} style={[styles.moodItem, i > 0 && styles.moodItemBorder]}>
                <View style={styles.md}>
                  <Text style={styles.mdN}>{day}</Text>
                  <Text style={styles.mdL}>{lbl}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mt}>{s.food || (s.mode === 'breathe' ? 'Breathing session' : 'Talked with Noit')}</Text>
                  <Text style={styles.mn} numberOfLines={2}>
                    {s.recap_text || `${formatDuration(s.duration)} · ${s.mode}`}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: cs.bg }]}>
                  <Text style={[styles.chipText, { color: cs.color }]}>{cs.label}</Text>
                </View>
              </View>
            );
          })}
          {recent.length === 0 && (
            <Text style={styles.emptyText}>
              No sessions yet — tap "Start session" to begin your journey with Noit 🌊
            </Text>
          )}
        </PulseCard>
      </ScrollView>

      <TabBar />
    </View>
  );
}

function computeWeekHeights(sessions: Session[]): number[] {
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  const now = new Date();
  const sevenAgo = new Date();
  sevenAgo.setDate(now.getDate() - 6);

  for (const s of sessions) {
    const d = new Date(s.created_at);
    if (d < sevenAgo) continue;
    const day = d.getDay();
    const idx = day === 0 ? 6 : day - 1;
    buckets[idx] += Math.max(s.duration / 60, 5);
  }
  const max = Math.max(...buckets, 1);
  return buckets.map((b) => Math.round((b / max) * 52));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#6A4AAC', overflow: 'hidden' },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 22, paddingTop: 60, paddingBottom: 14 },
  dateStr: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.52)' },
  greet: { fontSize: 27, fontWeight: '700', color: 'white', marginTop: 3 },
  secTitle: {
    fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.42)',
    letterSpacing: 1.5, textTransform: 'uppercase',
    paddingHorizontal: 22, paddingTop: 20, paddingBottom: 10,
  },
  checkin: {
    marginHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 26, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 40, elevation: 8,
  },
  ciLeft: { flex: 1 },
  ciTag: {
    backgroundColor: 'rgba(123,91,169,0.1)', borderRadius: 10,
    paddingVertical: 3, paddingHorizontal: 10, alignSelf: 'flex-start',
  },
  ciTagText: { fontSize: 11, fontWeight: '600', color: '#7B5BA9', letterSpacing: 1, textTransform: 'uppercase' },
  ciTitle: { fontSize: 20, fontWeight: '700', color: '#2B1A52', marginTop: 8, lineHeight: 24 },
  ciSub: { fontSize: 13, color: 'rgba(43,26,82,0.52)', marginTop: 4 },
  ciBtn: {
    backgroundColor: '#7B5BA9', borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 16, marginTop: 14, alignSelf: 'flex-start',
    shadowColor: '#7B5BA9', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 6,
  },
  ciBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  streakRow: { paddingHorizontal: 18, flexDirection: 'row', gap: 10 },
  streakCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20, paddingVertical: 16, paddingHorizontal: 14, gap: 4,
  },
  sv: { fontSize: 28, fontWeight: '700', color: '#2B1A52', lineHeight: 30 },
  sl: { fontSize: 12, color: 'rgba(43,26,82,0.52)', fontWeight: '500' },
  moodCheckinWrap: { marginHorizontal: 18, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  weekCard: { marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 14 },
  weekRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  wd: { flex: 1, alignItems: 'center', gap: 5 },
  wb: { width: '100%', borderRadius: 5 },
  wl: { fontSize: 10, fontWeight: '600', color: 'rgba(43,26,82,0.4)' },
  moodList: { paddingHorizontal: 18, gap: 9 },
  recentCard: {
    marginHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 4,
  },
  moodItem: {
    paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', gap: 13,
  },
  moodItemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(43,26,82,0.06)',
  },
  md: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(92,62,156,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  mdN: { fontSize: 15, fontWeight: '700', color: '#5C3E9C', lineHeight: 16 },
  mdL: { fontSize: 9, fontWeight: '600', color: 'rgba(92,62,156,0.6)', textTransform: 'uppercase' },
  mt: { fontSize: 14, fontWeight: '600', color: '#2B1A52' },
  mn: { fontSize: 12, color: 'rgba(43,26,82,0.52)', marginTop: 2, lineHeight: 16 },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  chipText: { fontSize: 11, fontWeight: '600' },
  emptyCard: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 18, padding: 22, alignItems: 'center' },
  emptyText: { color: 'rgba(43,26,82,0.6)', fontSize: 13.5, textAlign: 'center', lineHeight: 20 },
});
