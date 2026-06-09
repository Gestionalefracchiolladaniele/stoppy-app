import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { StoppyMini, stoppyVariantForIntensity } from '@/components/StoppyMini';
import { formatDuration } from '@/lib/format';
import { useRecentSessions } from '@/lib/session-store';
import type { Intensity } from '@/types';

const URGE_LABEL: Record<Intensity, string> = {
  1: 'Barely',
  2: 'Mild',
  3: 'Medium',
  4: 'Strong',
  5: 'Intense',
};

export function TodayIntensityDisplay() {
  const sessions = useRecentSessions();
  const last = sessions[0];

  if (!last || !last.mood_after) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Last session</Text>
        <View style={styles.emptyRow}>
          <View style={styles.emptyEmojiWrap}>
            <StoppyMini state="curious" size={44} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emptyTitle}>No session yet</Text>
            <Text style={styles.emptySub}>Tap "Start session" to begin</Text>
          </View>
        </View>
      </View>
    );
  }

  const d = new Date(last.created_at);
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const isToday = d.toDateString() === new Date().toDateString();
  const dateLabel = isToday
    ? `Today · ${timeStr}`
    : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const triggerLabel = last.trigger || (last.mode === 'breathe' ? 'Breathing session' : 'Talked with Stoppy');

  // Urge intensity: lower-after = relief, so a positive delta (= good) is before − after.
  const delta = (last.mood_before ?? 0) - (last.mood_after ?? 0);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Last session</Text>

      {/* Before → After row with real Stoppy minis */}
      <View style={styles.moodRow}>
        <View style={styles.moodSlot}>
          <Text style={styles.moodTag}>Before</Text>
          <StoppyMini state={stoppyVariantForIntensity(last.mood_before)} size={48} />
          <Text style={styles.moodLabel}>{URGE_LABEL[last.mood_before as Intensity] ?? '—'}</Text>
        </View>

        <View style={styles.arrow}>
          <Svg width={26} height={18} viewBox="0 0 26 18" fill="none">
            <Path
              d="M2 9 L22 9 M16 3 L22 9 L16 15"
              stroke="#38C97A"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          {delta !== 0 && (
            <Text style={[styles.deltaText, delta > 0 ? styles.deltaUp : styles.deltaDown]}>
              {delta > 0 ? `+${delta}` : delta}
            </Text>
          )}
        </View>

        <View style={styles.moodSlot}>
          <Text style={styles.moodTag}>After</Text>
          <StoppyMini state={stoppyVariantForIntensity(last.mood_after)} size={48} />
          <Text style={styles.moodLabel}>{URGE_LABEL[last.mood_after as Intensity] ?? '—'}</Text>
        </View>
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        <Text style={styles.meta} numberOfLines={1}>
          {triggerLabel} · {formatDuration(last.duration)}
        </Text>
        <Text style={styles.time}>{dateLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F2218',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(56,201,122,0.06)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 12,
  },
  moodSlot: { flex: 1, alignItems: 'center', gap: 4 },
  moodTag: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(15,34,24,0.5)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  moodLabel: { fontSize: 13, fontWeight: '700', color: '#0F2218' },
  arrow: { alignItems: 'center', gap: 3, paddingHorizontal: 2 },
  deltaText: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  deltaUp: { color: '#1A6B44', backgroundColor: 'rgba(26,107,68,0.12)' },
  deltaDown: { color: '#8A1840', backgroundColor: 'rgba(138,24,64,0.12)' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  meta: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(15,34,24,0.62)',
    textTransform: 'capitalize',
  },
  time: {
    fontSize: 11,
    color: 'rgba(15,34,24,0.42)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  emptyEmojiWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(56,201,122,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F2218' },
  emptySub: { fontSize: 12, color: 'rgba(15,34,24,0.5)', marginTop: 2 },
});
