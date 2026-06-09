import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { supabase } from './supabase';
import {
  fetchSessionStats,
  HOUR_BUCKETS,
  SessionStats,
  WEEKDAY_LABELS,
} from './supabase-sessions';

interface ExportResult {
  shared: boolean;
  error?: string;
}

/**
 * Escape a CSV field per RFC 4180 — wrap in quotes if contains comma/quote/newline.
 */
function csvField(value: any): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(rows: Array<Record<string, any>>, columns: string[]): string {
  const header = columns.join(',');
  const body = rows
    .map((row) => columns.map((col) => csvField(row[col])).join(','))
    .join('\n');
  return `${header}\n${body}\n`;
}

function fmtMood(n: number | null | undefined): string {
  if (n == null) return '';
  return n.toFixed(2);
}

function buildStatsSummarySection(label: string, stats: SessionStats): string {
  const lines: string[] = [];
  lines.push(`--- ${label} ---`);
  lines.push(
    buildCsv(
      [
        {
          total_sessions: stats.total,
          feed_count: stats.feedCount,
          breathe_count: stats.breatheCount,
          avg_mood_before: fmtMood(stats.avgMoodBefore),
          avg_mood_after: fmtMood(stats.avgMoodAfter),
          avg_mood_delta: fmtMood(stats.avgMoodDelta),
          total_duration_sec: stats.totalDurationSec,
          best_time_of_day: stats.bestTimeBucket?.label ?? '',
          best_time_avg_delta: fmtMood(stats.bestTimeBucket?.avgDelta ?? null),
        },
      ],
      [
        'total_sessions',
        'feed_count',
        'breathe_count',
        'avg_mood_before',
        'avg_mood_after',
        'avg_mood_delta',
        'total_duration_sec',
        'best_time_of_day',
        'best_time_avg_delta',
      ],
    ),
  );
  return lines.join('\n');
}

function buildTopCravingsSection(label: string, stats: SessionStats): string {
  const rows = stats.moodByFood.map((f) => ({
    trigger: f.food,
    count: f.count,
    avg_before: fmtMood(f.avgBefore),
    avg_after: fmtMood(f.avgAfter),
    avg_delta: fmtMood(f.delta),
  }));
  return `--- ${label} ---\n${buildCsv(rows, ['trigger', 'count', 'avg_before', 'avg_after', 'avg_delta'])}`;
}

function buildHeatmapSection(label: string, stats: SessionStats): string {
  // Rows are weekdays, columns are hour buckets. First col = weekday.
  const cols = ['weekday', ...HOUR_BUCKETS.map((b) => b.label)];
  const rows = WEEKDAY_LABELS.map((d, di) => {
    const row: Record<string, any> = { weekday: d };
    HOUR_BUCKETS.forEach((b, bi) => {
      row[b.label] = stats.byWeekdayHour[di]?.[bi] ?? 0;
    });
    return row;
  });
  return `--- ${label} ---\n${buildCsv(rows, cols)}`;
}

function buildMoodSeriesSection(label: string, stats: SessionStats): string {
  const rows = stats.moodSeries.map((p) => ({
    bucket: p.label,
    mood_before: fmtMood(p.before),
    mood_after: fmtMood(p.after),
  }));
  return `--- ${label} ---\n${buildCsv(rows, ['bucket', 'mood_before', 'mood_after'])}`;
}

function buildDeltaByHourSection(label: string, stats: SessionStats): string {
  const rows = HOUR_BUCKETS.map((b, i) => ({
    time_of_day: b.label,
    range_label: `${b.start.toString().padStart(2, '0')}:00-${b.end.toString().padStart(2, '0')}:00`,
    avg_mood_delta: fmtMood(stats.deltaByHourBucket[i]),
  }));
  return `--- ${label} ---\n${buildCsv(rows, ['time_of_day', 'range_label', 'avg_mood_delta'])}`;
}

/**
 * Export all user data + derived analytics as a multi-section CSV bundle
 * and open the share sheet.
 */
export async function exportUserDataAsCsv(userId: string): Promise<ExportResult> {
  try {
    // Define ranges for analytics blocks: all-time + last 7d + last 30d
    const now = new Date();
    const last7 = new Date(now); last7.setDate(now.getDate() - 7);
    const last30 = new Date(now); last30.setDate(now.getDate() - 30);
    const epoch = new Date(0);

    // Fetch raw data + derived stats in parallel
    const [profileRes, sessionsRes, moodsRes, statsAll, stats30, stats7] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).maybeSingle(),
      supabase.from('sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('daily_moods').select('*').eq('user_id', userId).order('date', { ascending: false }),
      fetchSessionStats(userId, epoch.toISOString()).catch(() => null),
      fetchSessionStats(userId, last30.toISOString()).catch(() => null),
      fetchSessionStats(userId, last7.toISOString()).catch(() => null),
    ]);

    const profile = profileRes.data ? [profileRes.data] : [];
    const sessions = sessionsRes.data ?? [];
    const moods = moodsRes.data ?? [];

    const sections: string[] = [];

    sections.push(`# Stoppy data export — generated ${now.toISOString()}`);
    sections.push(`# User: ${profile[0]?.email ?? userId}`);
    sections.push('');

    sections.push('=== ACCOUNT ===');
    sections.push(
      buildCsv(profile, [
        'id', 'email', 'name', 'created_at',
        'birth_year', 'craving_time', 'subscription_status',
        'notifications_enabled', 'check_in_time', 'reminder_presets',
        'topics', 'disclaimer_accepted',
      ]),
    );

    sections.push('\n=== HISTORY — SESSIONS ===');
    sections.push(
      buildCsv(
        // Legacy rows may still carry `food`; surface it as `trigger`.
        sessions.map((s: any) => ({ ...s, trigger: s.trigger ?? s.food ?? '' })),
        [
          'id', 'created_at', 'trigger', 'mode', 'duration',
          'mood_before', 'mood_after', 'recap_text',
        ],
      ),
    );

    sections.push('\n=== HISTORY — DAILY MOODS ===');
    sections.push(buildCsv(moods, ['id', 'date', 'mood', 'created_at']));

    if (statsAll) {
      sections.push('\n=== INSIGHTS — SUMMARY ===');
      sections.push(buildStatsSummarySection('All time', statsAll));
      if (stats30) sections.push(buildStatsSummarySection('Last 30 days', stats30));
      if (stats7) sections.push(buildStatsSummarySection('Last 7 days', stats7));

      sections.push('\n=== INSIGHTS — TOP TRIGGERS (urge relief by trigger) ===');
      sections.push(buildTopCravingsSection('All time', statsAll));
      if (stats30) sections.push(buildTopCravingsSection('Last 30 days', stats30));
      if (stats7) sections.push(buildTopCravingsSection('Last 7 days', stats7));

      sections.push('\n=== INSIGHTS — MOOD SERIES OVER TIME ===');
      sections.push(buildMoodSeriesSection('All time', statsAll));
      if (stats30) sections.push(buildMoodSeriesSection('Last 30 days', stats30));
      if (stats7) sections.push(buildMoodSeriesSection('Last 7 days', stats7));

      sections.push('\n=== INSIGHTS — BEST TIME OF DAY (avg mood delta by bucket) ===');
      sections.push(buildDeltaByHourSection('All time', statsAll));
      if (stats30) sections.push(buildDeltaByHourSection('Last 30 days', stats30));
      if (stats7) sections.push(buildDeltaByHourSection('Last 7 days', stats7));

      sections.push('\n=== INSIGHTS — WHEN URGES HIT (sessions per weekday × time-of-day) ===');
      sections.push(buildHeatmapSection('All time', statsAll));
      if (stats30) sections.push(buildHeatmapSection('Last 30 days', stats30));
      if (stats7) sections.push(buildHeatmapSection('Last 7 days', stats7));
    }

    const csvContent = sections.join('\n');

    const fileUri = `${FileSystem.cacheDirectory}stoppy-data-export-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return { shared: false, error: 'Sharing is not available on this device.' };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Your Stoppy data export',
      UTI: 'public.comma-separated-values-text',
    });

    return { shared: true };
  } catch (e: any) {
    return { shared: false, error: e?.message ?? String(e) };
  }
}
