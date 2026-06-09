import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { CalendarPicker, DateRange } from '@/components/CalendarPicker';
import { StoppyMini as NoitMini, stoppyVariantForIntensity as noitVariantForMood } from '@/components/StoppyMini';
import { ForestBg as PurpleBg } from '@/components/ForestBg';
import { TabBar } from '@/components/TabBar';
import { useAuthStore } from '@/lib/auth-store';
import { formatDuration } from '@/lib/format';
import {
  fetchSessionStats,
  HOUR_BUCKETS,
  SessionStats,
  WEEKDAY_LABELS,
} from '@/lib/supabase-sessions';
import { useSyncPulse } from '@/lib/use-pulse';
import type { CravingMode } from '@/types';

type Range = '2W' | '1W' | '1M';
type ModeTab = 'all' | CravingMode;
type AvgView = 'mood' | 'bestTime';
type FoodView = 'top' | 'mood';

const HOUR_LABEL_FULL: Record<string, string> = {
  '12a': '12am – 4am',
  '4a': '4am – 8am',
  '8a': '8am – 12pm',
  '12p': '12pm – 4pm',
  '4p': '4pm – 8pm',
  '8p': '8pm – 12am',
};

function rangeToSince(range: Range): string {
  const d = new Date();
  if (range === '1W') d.setDate(d.getDate() - 7);
  else if (range === '2W') d.setDate(d.getDate() - 14);
  else d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

function fmt(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Average URGE intensity → label (higher = more intense).
function moodLabelFromAvg(m: number | null): string {
  if (m === null) return '—';
  if (m >= 4.5) return 'Intense';
  if (m >= 3.5) return 'Strong';
  if (m >= 2.5) return 'Medium';
  if (m >= 1.5) return 'Mild';
  return 'Barely';
}

function PulseCard({ style, children }: { style?: any; children: React.ReactNode }) {
  const scale = useSyncPulse();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

export default function InsightsScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const [range, setRange] = useState<Range>('1W');
  const [modeTab, setModeTab] = useState<ModeTab>('all');
  const [calVisible, setCalVisible] = useState(false);
  const [calAnchor, setCalAnchor] = useState({ top: 100, right: 18 });
  const calBtnRef = useRef<View>(null);
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [avgView, setAvgView] = useState<AvgView>('mood');
  const [foodView, setFoodView] = useState<FoodView>('top');

  const since = customRange ? customRange.start.toISOString() : rangeToSince(range);
  const rangeLabel = customRange
    ? `${fmt(customRange.start)} → ${fmt(customRange.end)}`
    : range === '1W' ? 'Last 7 days' : range === '2W' ? 'Last 14 days' : 'Last month';

  const modeFilter: CravingMode | undefined = modeTab === 'all' ? undefined : modeTab;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const st = await fetchSessionStats(userId, since, modeFilter);
      setStats(st);
    } catch (e) {
      console.warn('[insights] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [userId, since, modeFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [since, modeTab]);

  const openCalendar = () => {
    calBtnRef.current?.measureInWindow((x, y, w) => {
      const { width: sw } = require('react-native').Dimensions.get('window');
      setCalAnchor({ top: y, right: sw - x - w });
      setCalVisible(true);
    });
  };

  const topFoods = stats?.topFoods ?? [];
  const maxFoodCount = Math.max(...topFoods.map((f) => f.count), 1);

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

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <View style={styles.headerRight}>
            <View style={styles.weekTabs}>
              {(['2W', '1W', '1M'] as Range[]).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => { setRange(r); setCustomRange(null); }}
                  style={[styles.wt, range === r && !customRange && styles.wtOn]}
                >
                  <Text style={[styles.wtText, range === r && !customRange && styles.wtTextOn]}>{r}</Text>
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
          </View>
        </View>

        <Text style={styles.rangeLabel}>{rangeLabel}</Text>

        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          <ModeTabBtn label={`All ${stats?.total ?? 0}`} active={modeTab === 'all'} onPress={() => setModeTab('all')} />
          <ModeTabBtn label={`💬 Feed ${stats?.feedCount ?? 0}`} active={modeTab === 'feed'} onPress={() => setModeTab('feed')} />
          <ModeTabBtn label={`🌬️ Breathe ${stats?.breatheCount ?? 0}`} active={modeTab === 'breathe'} onPress={() => setModeTab('breathe')} />
        </View>

        {/* Mood before / after chart — adaptive to selected range */}
        <PulseCard style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardLabel}>Urge before vs after</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'rgba(56,201,122,0.5)' }]} />
                <Text style={styles.legendText}>Before</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#1A8044' }]} />
                <Text style={styles.legendText}>After</Text>
              </View>
            </View>
          </View>
          <MoodChart series={stats?.moodSeries ?? []} />
        </PulseCard>

        {/* Average mood / Best time of day — single card with a 2-way switch */}
        <PulseCard style={styles.moodAvgCard}>
          <View style={styles.cardHead}>
            <Text style={styles.cardLabel}>
              {avgView === 'mood' ? 'Average urge' : 'Best time of day'}
            </Text>
            <SwitchTabs
              value={avgView}
              onChange={(v) => setAvgView(v as AvgView)}
              options={[
                { id: 'mood', label: 'Urge' },
                { id: 'bestTime', label: 'Best time' },
              ]}
            />
          </View>

          {avgView === 'mood' ? (
            <>
              <View style={styles.moodAvgRow}>
                <View style={styles.moodAvgSlot}>
                  <Text style={styles.avgTag}>Before</Text>
                  <NoitMini state={noitVariantForMood(stats?.avgMoodBefore ?? null)} size={48} />
                  <Text style={styles.moodAvgVal}>{moodLabelFromAvg(stats?.avgMoodBefore ?? null)}</Text>
                </View>
                <View style={styles.moodAvgArrow}>
                  <Svg width={28} height={20} viewBox="0 0 28 20" fill="none">
                    <Path
                      d="M2 10 L24 10 M18 4 L24 10 L18 16"
                      stroke="#38C97A"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  {stats?.avgMoodDelta != null && Math.abs(stats.avgMoodDelta) > 0.05 && (
                    <Text
                      style={[
                        styles.deltaPill,
                        stats.avgMoodDelta > 0 ? styles.deltaUp : styles.deltaDown,
                      ]}
                    >
                      {stats.avgMoodDelta > 0
                        ? `+${stats.avgMoodDelta.toFixed(1)}`
                        : stats.avgMoodDelta.toFixed(1)}
                    </Text>
                  )}
                </View>
                <View style={styles.moodAvgSlot}>
                  <Text style={styles.avgTag}>After</Text>
                  <NoitMini state={noitVariantForMood(stats?.avgMoodAfter ?? null)} size={48} />
                  <Text style={styles.moodAvgVal}>{moodLabelFromAvg(stats?.avgMoodAfter ?? null)}</Text>
                </View>
              </View>
              <Text style={styles.moodAvgFooter}>
                Average across {stats?.total ?? 0} {stats?.total === 1 ? 'session' : 'sessions'}
              </Text>
            </>
          ) : (
            <BestTimePanel
              bestBucket={stats?.bestTimeBucket ?? null}
              deltaByBucket={stats?.deltaByHourBucket ?? Array(6).fill(null)}
            />
          )}
        </PulseCard>

        {/* Total time */}
        {stats && stats.total > 0 && (
          <PulseCard style={styles.totalCard}>
            <Text style={styles.cardLabel}>Total time</Text>
            <Text style={styles.totalVal}>{formatDuration(stats.totalDurationSec)}</Text>
            <Text style={styles.totalSub}>
              {stats.feedCount} feed · {stats.breatheCount} breathe
            </Text>
          </PulseCard>
        )}

        {/* When urges hit — heatmap weekday × hour bucket */}
        <PulseCard style={styles.timeCard}>
          <Text style={styles.cardLabel}>When urges hit</Text>
          <WeekdayHourHeatmap byWeekdayHour={stats?.byWeekdayHour ?? Array.from({ length: 7 }, () => Array(6).fill(0))} />
        </PulseCard>

        {/* Triggers — Top counts / Urge relief by trigger switch */}
        <PulseCard style={styles.themeCard}>
          <View style={styles.cardHead}>
            <Text style={styles.cardLabel}>
              {foodView === 'top'
                ? `Top ${modeTab === 'breathe' ? 'breath moments' : 'triggers'}`
                : 'Relief by trigger'}
            </Text>
            <SwitchTabs
              value={foodView}
              onChange={(v) => setFoodView(v as FoodView)}
              options={[
                { id: 'top', label: 'Top' },
                { id: 'mood', label: 'Relief' },
              ]}
            />
          </View>

          {loading && !stats && <Text style={styles.subText}>Loading…</Text>}
          {!loading && topFoods.length === 0 && (
            <Text style={styles.subText}>No sessions yet in this period.</Text>
          )}

          {foodView === 'top' ? (
            topFoods.map((t) => (
              <View key={t.food} style={styles.themeRow}>
                <Text style={styles.themeName} numberOfLines={1}>{t.food}</Text>
                <View style={styles.barBg}>
                  <View style={[styles.bar, { width: `${Math.round((t.count / maxFoodCount) * 100)}%` }]} />
                </View>
                <Text style={styles.themePct}>{t.count}×</Text>
              </View>
            ))
          ) : (
            <MoodByCravingPanel data={stats?.moodByFood ?? []} />
          )}
        </PulseCard>
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

/* ────── Small in-card 2-way switch (used by Average mood + Top cravings cards) ────── */
function SwitchTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <View style={styles.switchTabs}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={[styles.switchTab, active && styles.switchTabOn]}
          >
            <Text style={[styles.switchTabText, active && styles.switchTabTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ────── Best time of day panel ────── */
function BestTimePanel({
  bestBucket,
  deltaByBucket,
}: {
  bestBucket: { label: string; avgDelta: number } | null;
  deltaByBucket: (number | null)[];
}) {
  if (!bestBucket) {
    return (
      <Text style={styles.subText}>
        Not enough data yet — need a few sessions across different times.
      </Text>
    );
  }
  const sign = bestBucket.avgDelta > 0 ? '+' : '';
  const fullLabel = HOUR_LABEL_FULL[bestBucket.label] ?? bestBucket.label;
  // Find max for bar normalization (positive deltas only — best lifts)
  const max = Math.max(...deltaByBucket.map((d) => d ?? -Infinity), 0.001);
  return (
    <View style={{ marginTop: 6 }}>
      <View style={styles.bestTimeHero}>
        <Text style={styles.bestTimeLbl}>Urges ease most when you start around</Text>
        <Text style={styles.bestTimeRange}>{fullLabel}</Text>
        <View style={[styles.deltaPill, styles.deltaUp, { alignSelf: 'center', marginTop: 6 }]}>
          <Text style={[styles.deltaPillText, styles.deltaUpText]}>
            {sign}{bestBucket.avgDelta.toFixed(1)} relief
          </Text>
        </View>
      </View>

      {/* Mini bar per bucket */}
      <View style={styles.bestTimeBars}>
        {HOUR_BUCKETS.map((b, i) => {
          const v = deltaByBucket[i];
          const isBest = bestBucket.label === b.label;
          const heightPct = v != null && v > 0 ? Math.max(8, Math.round((v / max) * 100)) : 6;
          return (
            <View key={b.label} style={styles.bestTimeBarCol}>
              <View style={styles.bestTimeBarTrack}>
                <View
                  style={[
                    styles.bestTimeBarFill,
                    { height: `${heightPct}%` },
                    v != null && v < 0 && { backgroundColor: 'rgba(138,24,64,0.45)' },
                    isBest && { backgroundColor: '#1A8044' },
                  ]}
                />
              </View>
              <Text style={[styles.bestTimeBarLbl, isBest && { color: '#1A8044', fontWeight: '700' }]}>
                {b.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ────── Mood by craving panel ────── */
function MoodByCravingPanel({
  data,
}: {
  data: { food: string; count: number; avgBefore: number | null; avgAfter: number | null; delta: number | null }[];
}) {
  if (data.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      {data.map((d) => {
        const delta = d.delta ?? 0;
        const sign = delta > 0 ? '+' : '';
        const deltaColor =
          delta > 0.1 ? styles.deltaUp : delta < -0.1 ? styles.deltaDown : styles.deltaNeutral;
        return (
          <View key={d.food} style={styles.mbcRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mbcFood} numberOfLines={1}>{d.food}</Text>
              <Text style={styles.mbcSub}>
                {d.count}× · {d.avgBefore != null ? d.avgBefore.toFixed(1) : '—'} → {d.avgAfter != null ? d.avgAfter.toFixed(1) : '—'}
              </Text>
            </View>
            <View style={[styles.deltaPill, deltaColor]}>
              <Text
                style={[
                  styles.deltaPillText,
                  delta > 0.1 ? styles.deltaUpText : delta < -0.1 ? styles.deltaDownText : styles.deltaNeutralText,
                ]}
              >
                {d.delta == null ? '—' : `${sign}${delta.toFixed(1)}`}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ──────────────── Mood chart (dual line: before / after) ──────────────── */

function MoodChart({ series }: { series: { label: string; before: number | null; after: number | null }[] }) {
  const W = 290, H = 110;
  const PAD_TOP = 8, PAD_BOTTOM = 22;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const n = series.length;
  const xFor = (i: number) => n === 1 ? W / 2 : (i / (n - 1)) * (W - 24) + 12;
  const yFor = (m: number) => PAD_TOP + chartH - ((m - 1) / 4) * chartH;

  const buildPath = (key: 'before' | 'after') => {
    const pts: { x: number; y: number; i: number }[] = [];
    for (let i = 0; i < series.length; i++) {
      const v = series[i][key];
      if (v !== null) pts.push({ x: xFor(i), y: yFor(v), i });
    }
    if (pts.length === 0) return { line: '', fill: '', pts };
    const line = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    const fill = `${line} L ${pts[pts.length - 1].x} ${PAD_TOP + chartH} L ${pts[0].x} ${PAD_TOP + chartH} Z`;
    return { line, fill, pts };
  };

  const before = buildPath('before');
  const after = buildPath('after');

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="afg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A8044" stopOpacity={0.32} />
            <Stop offset="1" stopColor="#1A8044" stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {/* horizontal guide lines (mood 1, 3, 5) */}
        {[1, 3, 5].map((m) => (
          <Rect
            key={m}
            x={0}
            y={yFor(m)}
            width={W}
            height={1}
            fill="rgba(15,34,24,0.05)"
          />
        ))}

        {/* Before line (dashed, lighter) */}
        {before.line ? (
          <Path
            d={before.line}
            stroke="rgba(56,201,122,0.5)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 5"
            fill="none"
          />
        ) : null}

        {/* After line (solid, primary) */}
        {after.fill ? <Path d={after.fill} fill="url(#afg)" /> : null}
        {after.line ? (
          <Path
            d={after.line}
            stroke="#1A8044"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null}

        {/* Dots */}
        {after.pts.map((p, i) => (
          <Circle key={`a${i}`} cx={p.x} cy={p.y} r={4} fill="#1A8044" />
        ))}
        {before.pts.map((p, i) => (
          <Circle key={`b${i}`} cx={p.x} cy={p.y} r={2.5} fill="rgba(56,201,122,0.7)" />
        ))}
      </Svg>

      {/* Labels under the chart */}
      <View style={styles.chartLabels}>
        {series.map((p, i) => (
          <Text key={`${p.label}-${i}`} style={styles.chartLbl}>{p.label}</Text>
        ))}
      </View>
    </View>
  );
}

/* ──────────────── Heatmap weekday × hour bucket ──────────────── */

function WeekdayHourHeatmap({ byWeekdayHour }: { byWeekdayHour: number[][] }) {
  const max = Math.max(
    ...byWeekdayHour.flatMap((row) => row),
    1,
  );

  const colorFor = (count: number): string => {
    if (count === 0) return 'rgba(56,201,122,0.07)';
    const t = count / max;
    if (t < 0.34) return 'rgba(56,201,122,0.28)';
    if (t < 0.67) return 'rgba(56,201,122,0.58)';
    return '#1A8044';
  };

  return (
    <View style={{ marginTop: 6 }}>
      {/* Hour bucket headers */}
      <View style={styles.heatmapHeader}>
        <View style={{ width: 26 }} />
        {HOUR_BUCKETS.map((b) => (
          <Text key={b.label} style={styles.heatmapHourLbl}>{b.label}</Text>
        ))}
      </View>

      {/* Rows: one per weekday */}
      {WEEKDAY_LABELS.map((d, di) => (
        <View key={d} style={styles.heatmapRow}>
          <Text style={styles.heatmapDayLbl}>{d}</Text>
          {HOUR_BUCKETS.map((b, bi) => {
            const count = byWeekdayHour[di]?.[bi] ?? 0;
            return (
              <View
                key={`${d}-${b.label}`}
                style={[styles.heatmapCell, { backgroundColor: colorFor(count) }]}
              >
                {count > 0 && (
                  <Text style={styles.heatmapCount}>{count}</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1F6B4D', overflow: 'hidden' },
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: 22, paddingTop: 60, paddingBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 27, fontWeight: '700', color: 'white' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekTabs: {
    flexDirection: 'row', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 3,
  },
  wt: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 9 },
  wtOn: { backgroundColor: 'rgba(255,255,255,0.9)' },
  wtText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  wtTextOn: { color: '#1A8044' },
  calBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  calBtnActive: { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: 'white' },
  calBtnIcon: { fontSize: 16 },
  rangeLabel: {
    paddingHorizontal: 22, paddingBottom: 12,
    fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500',
  },
  modeTabs: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 14,
  },
  modeTab: {
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  modeTabOn: { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'white' },
  modeTabText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  modeTabTextOn: { color: '#1A8044' },
  chartCard: { marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 22, padding: 18 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  legendRow: { flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: 'rgba(15,34,24,0.55)', fontWeight: '500' },
  cardLabel: {
    fontSize: 12, fontWeight: '600', color: 'rgba(15,34,24,0.5)',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12,
  },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 4 },
  chartLbl: { fontSize: 10, color: 'rgba(15,34,24,0.45)', fontWeight: '600', flex: 1, textAlign: 'center' },
  moodAvgCard: {
    marginHorizontal: 18, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22, paddingVertical: 18, paddingHorizontal: 16,
  },
  moodAvgRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(56,201,122,0.06)', borderRadius: 16, paddingVertical: 14,
  },
  moodAvgSlot: { flex: 1, alignItems: 'center', gap: 5 },
  avgTag: { fontSize: 10, fontWeight: '700', color: 'rgba(15,34,24,0.5)', letterSpacing: 1.4, textTransform: 'uppercase' },
  moodAvgVal: { fontSize: 14, fontWeight: '700', color: '#0F2218' },
  moodAvgArrow: { alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  deltaPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  deltaPillText: { fontSize: 12, fontWeight: '700' },
  deltaUp: { backgroundColor: 'rgba(26,107,68,0.12)' },
  deltaUpText: { color: '#1A6B44' },
  deltaDown: { backgroundColor: 'rgba(138,24,64,0.12)' },
  deltaDownText: { color: '#8A1840' },
  deltaNeutral: { backgroundColor: 'rgba(15,34,24,0.08)' },
  deltaNeutralText: { color: 'rgba(15,34,24,0.55)' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  switchTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(56,201,122,0.08)',
    borderRadius: 10,
    padding: 2,
  },
  switchTab: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  switchTabOn: { backgroundColor: 'white' },
  switchTabText: { fontSize: 11, fontWeight: '600', color: 'rgba(15,34,24,0.55)' },
  switchTabTextOn: { color: '#1A8044' },
  bestTimeHero: {
    backgroundColor: 'rgba(56,201,122,0.06)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  bestTimeLbl: { fontSize: 12, color: 'rgba(15,34,24,0.55)', fontWeight: '500' },
  bestTimeRange: { fontSize: 22, fontWeight: '700', color: '#0F2218', marginTop: 4 },
  bestTimeBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14, height: 80, gap: 4 },
  bestTimeBarCol: { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end', height: '100%' },
  bestTimeBarTrack: { width: '100%', height: 56, justifyContent: 'flex-end' },
  bestTimeBarFill: { width: '100%', backgroundColor: 'rgba(56,201,122,0.45)', borderRadius: 4 },
  bestTimeBarLbl: { fontSize: 10, color: 'rgba(15,34,24,0.5)', fontWeight: '600' },
  mbcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(56,201,122,0.06)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  mbcFood: { fontSize: 14, fontWeight: '700', color: '#0F2218', textTransform: 'capitalize' },
  mbcSub: { fontSize: 12, color: 'rgba(15,34,24,0.52)', marginTop: 2 },
  moodAvgFooter: { fontSize: 12, color: 'rgba(15,34,24,0.45)', textAlign: 'center', marginTop: 10 },
  totalCard: {
    marginHorizontal: 18, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22, paddingVertical: 18, paddingHorizontal: 20,
  },
  totalVal: { fontSize: 26, fontWeight: '700', color: '#0F2218' },
  totalSub: { fontSize: 13, color: 'rgba(15,34,24,0.52)', marginTop: 3 },
  timeCard: {
    marginHorizontal: 18, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22, paddingVertical: 18, paddingHorizontal: 16,
  },
  heatmapHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 4 },
  heatmapRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 },
  heatmapDayLbl: { width: 26, fontSize: 10, fontWeight: '700', color: 'rgba(15,34,24,0.55)', textAlign: 'center' },
  heatmapHourLbl: { flex: 1, fontSize: 9, fontWeight: '600', color: 'rgba(15,34,24,0.42)', textAlign: 'center' },
  heatmapCell: {
    flex: 1, height: 22, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  heatmapCount: { fontSize: 9, fontWeight: '700', color: 'white' },
  themeCard: {
    marginHorizontal: 18, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22, paddingVertical: 18, paddingHorizontal: 20,
  },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  themeName: { fontSize: 13, fontWeight: '600', color: '#0F2218', width: 90, textTransform: 'capitalize' },
  barBg: { flex: 1, height: 8, backgroundColor: 'rgba(15,34,24,0.08)', borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: '#38C97A', borderRadius: 4 },
  themePct: { fontSize: 12, color: 'rgba(15,34,24,0.5)', fontWeight: '500', width: 28, textAlign: 'right' },
  subText: { fontSize: 13, color: 'rgba(15,34,24,0.4)', textAlign: 'center', paddingVertical: 12 },
});
