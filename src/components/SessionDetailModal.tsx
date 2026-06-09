import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { StoppyMini as NoitMini, stoppyVariantForIntensity as noitVariantForMood } from '@/components/StoppyMini';
import { ForestBg as PurpleBg } from '@/components/ForestBg';
import { formatDuration } from '@/lib/format';
import type { Session } from '@/types';

// Urge intensity labels (1 = barely there … 5 = overwhelming).
const MOOD_LABEL: Record<number, string> = {
  1: 'Barely',
  2: 'Mild',
  3: 'Medium',
  4: 'Strong',
  5: 'Intense',
};

export interface SessionDetailModalProps {
  session: Session | null;
  visible: boolean;
  onClose: () => void;
}

export function SessionDetailModal({ session, visible, onClose }: SessionDetailModalProps) {
  if (!session) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose} />
    );
  }

  const d = new Date(session.created_at);
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const isBreathe = session.mode === 'breathe';
  // Urge intensity: lower-after = relief, so positive (good/green) delta is before − after.
  const delta = session.mood_before - session.mood_after;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#1F6B4D', overflow: 'hidden' }}>
        <PurpleBg />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.hero}>
            <Pressable onPress={onClose} style={styles.backBtn}>
              <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                <Path
                  d="M10 3L5 8l5 5"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
            <View style={styles.modeChip}>
              <Text style={styles.modeChipText}>
                {isBreathe ? '🌬️ Breathe session' : '💬 Feed session'}
              </Text>
            </View>
            <Text style={styles.dateLine}>{dateStr}</Text>
            <Text style={styles.timeLine}>{timeStr}</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Food / title */}
            <Text style={styles.title}>
              {session.trigger || (isBreathe ? 'Breathing session' : 'Talked with Stoppy')}
            </Text>

            {/* Mood before → after row */}
            <View style={styles.moodRow}>
              <View style={styles.moodSlot}>
                <Text style={styles.moodLabel}>Before</Text>
                <NoitMini state={noitVariantForMood(session.mood_before)} size={56} />
                <Text style={styles.moodValue}>{MOOD_LABEL[session.mood_before] ?? '—'}</Text>
              </View>

              <View style={styles.moodArrow}>
                <Svg width={28} height={20} viewBox="0 0 28 20" fill="none">
                  <Path
                    d="M2 10 L24 10 M18 4 L24 10 L18 16"
                    stroke="#38C97A"
                    strokeWidth={2.5}
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
                <Text style={styles.moodLabel}>After</Text>
                <NoitMini state={noitVariantForMood(session.mood_after)} size={56} />
                <Text style={styles.moodValue}>{MOOD_LABEL[session.mood_after] ?? '—'}</Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{formatDuration(session.duration)}</Text>
                <Text style={styles.statLbl}>Duration</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>
                  {delta > 0 ? `+${delta}` : delta === 0 ? '—' : delta}
                </Text>
                <Text style={styles.statLbl}>Urge shift</Text>
              </View>
            </View>

            {/* Recap */}
            <Text style={styles.section}>Stoppy's recap</Text>
            <View style={styles.recapBox}>
              <Text style={styles.recapText}>
                {session.recap_text || 'No recap was generated for this session.'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  modeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  dateLine: { fontSize: 18, fontWeight: '700', color: 'white', marginTop: 14 },
  timeLine: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 36,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F2218',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    backgroundColor: 'rgba(56,201,122,0.06)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  moodSlot: { flex: 1, alignItems: 'center', gap: 6 },
  moodLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(15,34,24,0.5)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  moodValue: { fontSize: 14, fontWeight: '700', color: '#0F2218' },
  moodArrow: { alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  deltaText: { fontSize: 13, fontWeight: '700' },
  deltaUp: { color: '#1A6B44' },
  deltaDown: { color: '#8A1840' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(56,201,122,0.06)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 3,
  },
  statVal: { fontSize: 20, fontWeight: '700', color: '#0F2218' },
  statLbl: { fontSize: 11, color: 'rgba(15,34,24,0.55)', fontWeight: '500' },
  section: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A8044',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 10,
  },
  recapBox: {
    backgroundColor: 'rgba(56,201,122,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56,201,122,0.18)',
    borderRadius: 18,
    padding: 16,
  },
  recapText: { fontSize: 14, lineHeight: 22, color: '#0F2218' },
  convo: { gap: 8 },
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, maxWidth: '85%' },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#38C97A',
    borderBottomRightRadius: 4,
  },
  bubbleNoit: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56,201,122,0.1)',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: 'white' },
  bubbleTextNoit: { color: '#0F2218' },
});
