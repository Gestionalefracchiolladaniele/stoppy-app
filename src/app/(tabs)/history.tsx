import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { CalendarPicker, DateRange } from '@/components/CalendarPicker';
import { StoppyMini as NoitMini, stoppyVariantForMood as noitVariantForMood } from '@/components/StoppyMini';
import { ForestBg as PurpleBg } from '@/components/ForestBg';
import { SessionDetailModal } from '@/components/SessionDetailModal';
import { TabBar } from '@/components/TabBar';
import { useAuthStore } from '@/lib/auth-store';
import { formatDuration } from '@/lib/format';
import { useRecentSessions, useSessionStore } from '@/lib/session-store';
import { deleteSession } from '@/lib/supabase-sessions';
import { useSyncPulse } from '@/lib/use-pulse';
import type { CravingMode, Session } from '@/types';

type Range = '2W' | '1W' | '1M';
type ModeTab = 'all' | CravingMode;

function fmt(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function filterByRange(sessions: Session[], range: Range, customRange: DateRange | null): Session[] {
  const now = new Date();
  if (customRange) {
    const end = new Date(customRange.end);
    end.setHours(23, 59, 59);
    return sessions.filter((s) => {
      const d = new Date(s.created_at);
      return d >= customRange.start && d <= end;
    });
  }
  const since = new Date(now);
  if (range === '1W') since.setDate(now.getDate() - 7);
  else if (range === '2W') since.setDate(now.getDate() - 14);
  else since.setMonth(now.getMonth() - 1);
  return sessions.filter((s) => new Date(s.created_at) >= since);
}

function PulseCard({ style, children }: { style?: any; children: React.ReactNode }) {
  const scale = useSyncPulse();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

export default function HistoryScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const sessions = useRecentSessions();
  const { loadRecentSessions } = useSessionStore.getState();
  const [range, setRange] = useState<Range>('1M');
  const [modeTab, setModeTab] = useState<ModeTab>('all');
  const [calVisible, setCalVisible] = useState(false);
  const [calAnchor, setCalAnchor] = useState({ top: 100, right: 18 });
  const calBtnRef = useRef<View>(null);
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [detailSession, setDetailSession] = useState<Session | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      loadRecentSessions(userId).catch(console.error);
    }, [userId]),
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedIds(new Set());
  };

  const confirmDeleteSelected = () => {
    if (selectedIds.size === 0) {
      exitSelectMode();
      return;
    }
    const n = selectedIds.size;
    Alert.alert(
      `Delete ${n} ${n === 1 ? 'session' : 'sessions'}?`,
      'This will permanently remove the selected sessions from your history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(Array.from(selectedIds).map((id) => deleteSession(id)));
              if (userId) await loadRecentSessions(userId);
            } catch (e: any) {
              Alert.alert('Could not delete', e?.message ?? String(e));
            } finally {
              exitSelectMode();
            }
          },
        },
      ],
    );
  };

  const byRange = filterByRange(sessions, range, customRange);
  const filtered = modeTab === 'all' ? byRange : byRange.filter((s) => s.mode === modeTab);
  const feedCount = byRange.filter((s) => s.mode === 'feed').length;
  const breatheCount = byRange.filter((s) => s.mode === 'breathe').length;
  const rangeLabel = customRange
    ? `${fmt(customRange.start)} → ${fmt(customRange.end)}`
    : range === '1W' ? 'Last 7 days' : range === '2W' ? 'Last 14 days' : 'Last month';

  const openCalendar = () => {
    calBtnRef.current?.measureInWindow((x, y, w) => {
      const { width: sw } = require('react-native').Dimensions.get('window');
      setCalAnchor({ top: y, right: sw - x - w });
      setCalVisible(true);
    });
  };

  return (
    <View style={styles.screen}>
      <PurpleBg />

      <CalendarPicker
        visible={calVisible}
        anchorTop={calAnchor.top}
        anchorRight={calAnchor.right}
        onClose={() => setCalVisible(false)}
        onConfirm={(dr) => { setCustomRange(dr); setCalVisible(false); }}
        initialRange={customRange ?? undefined}
      />

      <SessionDetailModal
        session={detailSession}
        visible={!!detailSession}
        onClose={() => setDetailSession(null)}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <View style={styles.headerRight}>
            <View style={styles.rangeTabs}>
              {(['2W', '1W', '1M'] as Range[]).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => { setRange(r); setCustomRange(null); }}
                  style={[styles.rt, range === r && !customRange && styles.rtOn]}
                >
                  <Text style={[styles.rtText, range === r && !customRange && styles.rtTextOn]}>{r}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              ref={calBtnRef}
              style={[styles.calBtn, (calVisible || customRange) && styles.calBtnActive]}
              onPress={openCalendar}
            >
              <Text style={styles.calBtnIcon}>📅</Text>
            </Pressable>
            <Pressable style={styles.addBtn} onPress={() => router.push('/session')}>
              <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                <Path d="M9 4v10M4 9h10" stroke="rgba(31,107,77,0.7)" strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>
        </View>

        {selectMode && (
          <View style={styles.selectBar}>
            <Text style={styles.selectBarText}>
              {selectedIds.size === 0
                ? 'Tap sessions to select'
                : `${selectedIds.size} selected`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={styles.selectCancel} onPress={exitSelectMode}>
                <Text style={styles.selectCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.selectDelete, selectedIds.size === 0 && { opacity: 0.4 }]}
                onPress={confirmDeleteSelected}
                disabled={selectedIds.size === 0}
              >
                <Text style={styles.selectDeleteText}>
                  Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.modeTabs}>
          <ModeTabBtn label={`All ${byRange.length}`} active={modeTab === 'all'} onPress={() => setModeTab('all')} />
          <ModeTabBtn label={`💬 Feed ${feedCount}`} active={modeTab === 'feed'} onPress={() => setModeTab('feed')} />
          <ModeTabBtn label={`🌬️ Breathe ${breatheCount}`} active={modeTab === 'breathe'} onPress={() => setModeTab('breathe')} />
          <Pressable
            style={[styles.trashTab, selectMode && styles.trashTabOn]}
            onPress={selectMode ? exitSelectMode : enterSelectMode}
          >
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path
                d="M3 4h10M6.5 4V2.5h3V4M5 4l.6 9a1 1 0 001 .9h2.8a1 1 0 001-.9L11 4"
                stroke={selectMode ? '#1A8044' : 'rgba(255,255,255,0.85)'}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>

        <Text style={styles.monthLabel}>
          {rangeLabel} · {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </Text>

        <View style={styles.list}>
          {filtered.length === 0 ? (
            <PulseCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>No history yet. Your sessions with Stoppy will appear here.</Text>
            </PulseCard>
          ) : (
            filtered.map((s) => {
              const d = new Date(s.created_at);
              const day = d.getDate();
              const lbl = d.toLocaleDateString('en-US', { weekday: 'short' });
              const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              const dur = formatDuration(s.duration);
              const isBreathe = s.mode === 'breathe';
              return (
                <PulseCard key={s.id}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.item,
                      pressed && { opacity: 0.85 },
                      selectMode && selectedIds.has(s.id) && styles.itemSelected,
                    ]}
                    onPress={() => {
                      if (selectMode) toggleSelect(s.id);
                      else setDetailSession(s);
                    }}
                  >
                    {selectMode && (
                      <View style={[styles.checkbox, selectedIds.has(s.id) && styles.checkboxOn]}>
                        {selectedIds.has(s.id) && (
                          <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                            <Path
                              d="M2.5 6L5 8.5L9.5 3.5"
                              stroke="white"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </Svg>
                        )}
                      </View>
                    )}
                    <View style={styles.date}>
                      <Text style={styles.dN}>{day}</Text>
                      <Text style={styles.dL}>{lbl}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.titleRow}>
                        <Text style={styles.modeIcon}>{isBreathe ? '🌬️' : '💬'}</Text>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {s.trigger || (isBreathe ? 'Breathing session' : 'Talked with Stoppy')}
                        </Text>
                      </View>
                      <Text style={styles.preview} numberOfLines={2}>
                        {s.recap_text || `${dur} · ${s.mode}`}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.dur}>{dur} · {time}</Text>
                      </View>
                    </View>
                    {/* NoitMini mood indicator (before → after) */}
                    <View style={styles.moodCol}>
                      <NoitMini state={noitVariantForMood(s.mood_before)} size={26} />
                      <Svg width={14} height={10} viewBox="0 0 14 10" fill="none" style={{ marginVertical: 2 }}>
                        <Path
                          d="M2 5 L11 5 M8 2 L11 5 L8 8"
                          stroke="#38C97A"
                          strokeWidth={1.6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                      <NoitMini state={noitVariantForMood(s.mood_after)} size={32} />
                    </View>
                  </Pressable>
                </PulseCard>
              );
            })
          )}
        </View>
      </ScrollView>

      <TabBar />
    </View>
  );
}

function ModeTabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeTab, active && styles.modeTabOn]}>
      <Text style={[styles.modeTabText, active && styles.modeTabTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1F6B4D', overflow: 'hidden' },
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: 22, paddingTop: 60, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 27, fontWeight: '700', color: 'white' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rangeTabs: {
    flexDirection: 'row', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 3,
  },
  rt: { paddingVertical: 4, paddingHorizontal: 7, borderRadius: 9 },
  rtOn: { backgroundColor: 'rgba(255,255,255,0.9)' },
  rtText: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  rtTextOn: { color: '#1A8044' },
  calBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  calBtnActive: { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: 'white' },
  calBtnIcon: { fontSize: 15 },
  addBtn: {
    width: 32, height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  modeTab: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modeTabOn: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'white',
  },
  modeTabText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  modeTabTextOn: { color: '#1A8044' },
  trashTab: {
    width: 34, height: 34,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 'auto',
  },
  trashTabOn: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'white',
  },
  modeIcon: { fontSize: 14 },
  monthLabel: {
    paddingHorizontal: 22, paddingBottom: 14,
    fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.42)',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  list: { paddingHorizontal: 18, gap: 10 },
  item: {
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20,
    paddingVertical: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  date: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(31,107,77,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  dN: { fontSize: 16, fontWeight: '700', color: '#1A8044', lineHeight: 18 },
  dL: { fontSize: 9, fontWeight: '600', color: 'rgba(31,107,77,0.6)', textTransform: 'uppercase' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#0F2218', textTransform: 'capitalize' },
  preview: { fontSize: 12.5, color: 'rgba(15,34,24,0.52)', marginTop: 3, lineHeight: 17 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  dur: { fontSize: 11, color: 'rgba(15,34,24,0.4)', fontWeight: '500' },
  moodCol: { alignItems: 'center', justifyContent: 'center', minWidth: 38 },
  emptyCard: { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 22, padding: 30, alignItems: 'center' },
  emptyText: { color: 'rgba(15,34,24,0.6)', fontSize: 14, textAlign: 'center', lineHeight: 21 },
  selectBar: {
    marginHorizontal: 18,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectBarText: { color: 'white', fontSize: 13, fontWeight: '600' },
  selectCancel: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  selectCancelText: { color: 'white', fontSize: 12, fontWeight: '600' },
  selectDelete: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#E05C5C',
  },
  selectDeleteText: { color: 'white', fontSize: 12, fontWeight: '700' },
  itemSelected: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderWidth: 2,
    borderColor: '#38C97A',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.8,
    borderColor: 'rgba(31,107,77,0.35)',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: '#38C97A',
    borderColor: '#38C97A',
  },
});
