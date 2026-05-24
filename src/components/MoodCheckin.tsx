import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { NoitMini, noitVariantForMood } from '@/components/NoitMini';
import { useAuthStore } from '@/lib/auth-store';
import { fetchTodayMood, upsertDailyMood } from '@/lib/supabase-sessions';
import { useSyncPulse } from '@/lib/use-pulse';
import type { Mood } from '@/types';

const MOOD_OPTIONS: { mood: Mood; label: string }[] = [
  { mood: 1, label: 'Low' },
  { mood: 2, label: 'Meh' },
  { mood: 3, label: 'OK' },
  { mood: 4, label: 'Good' },
  { mood: 5, label: 'Great' },
];

function AnimatedMoodNoit({ mood, selected }: { mood: Mood; selected: boolean }) {
  // base pulse from shared clock — same as all home cards
  const sharedPulse = useSyncPulse();
  // local override for select pop
  const localScale = useSharedValue(1.0);

  useEffect(() => {
    if (selected) {
      localScale.value = withSequence(
        withSpring(1.25, { damping: 6, stiffness: 280 }),
        withSpring(1.07, { damping: 10, stiffness: 200 }),
      );
    } else {
      localScale.value = 1.0;
    }
  }, [selected]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: selected ? localScale.value : sharedPulse.value * 1.0 }],
  }));

  return (
    <Animated.View style={animStyle}>
      <NoitMini state={noitVariantForMood(mood)} size={36} />
    </Animated.View>
  );
}

export function MoodCheckin({ flat }: { flat?: boolean }) {
  const userId = useAuthStore((s) => s.user?.id);
  const [selected, setSelected] = useState<Mood | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchTodayMood(userId).then((m) => setSelected(m));
  }, [userId]);

  const pick = async (m: Mood) => {
    if (!userId) return;
    setSelected(m);
    upsertDailyMood(userId, m).catch((e) => {
      console.error('[MoodCheckin] save error:', e);
      setSelected(null);
    });
  };

  return (
    <View style={flat ? styles.cardFlat : styles.card}>
      <Text style={styles.label}>How do you feel today?</Text>
      <View style={styles.row}>
        {MOOD_OPTIONS.map((o) => {
          const sel = selected === o.mood;
          return (
            <Pressable
              key={o.mood}
              onPress={() => pick(o.mood)}
              style={[styles.emojiBtn, sel && styles.emojiBtnSel]}
            >
              <AnimatedMoodNoit mood={o.mood} selected={sel} />
            </Pressable>
          );
        })}
      </View>
      {selected !== null && (
        <Text style={styles.savedLabel}>
          Saved · {MOOD_OPTIONS.find((o) => o.mood === selected)?.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 18,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  cardFlat: {
    padding: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2B1A52',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  emojiBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(92,62,156,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBtnSel: {
    backgroundColor: 'rgba(123,91,169,0.18)',
    borderWidth: 1.5,
    borderColor: '#7B5BA9',
  },
  emoji: { fontSize: 26 },
  savedLabel: {
    fontSize: 12,
    color: '#7B5BA9',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
});
