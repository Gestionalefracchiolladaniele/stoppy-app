import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Stoppy as Noit } from '@/components/Stoppy';
import { PaywallModal } from '@/components/PaywallModal';
import { ForestBg as PurpleBg } from '@/components/ForestBg';
import { TabBar } from '@/components/TabBar';
import { NotificationCenter } from '@/features/notifications/NotificationCenter';
import { useNotificationStore } from '@/features/notifications/notification-store';
import { useAuth, useAuthActions, useAuthStore } from '@/lib/auth-store';
import { exportUserDataAsCsv } from '@/lib/data-export';
import { deleteOwnAccount } from '@/lib/account-deletion';
import { formatDuration } from '@/lib/format';
import {
  cancelSessionReminder,
  registerForPushNotifications,
  scheduleDailySessionReminder,
} from '@/lib/push-notifications';
import {
  useRecentSessions,
  useSessionStore,
  useStreak,
} from '@/lib/session-store';
import { useSyncPulse } from '@/lib/use-pulse';

const PRIVACY_POLICY_URL = 'https://stoppy.app/privacy';

const DEFAULT_PRESETS = [
  { id: 'morning', label: '☀️', defaultTime: '09:00' },
  { id: 'afternoon', label: '🌤', defaultTime: '14:00' },
  { id: 'evening', label: '🌙', defaultTime: '21:00' },
];

function PulseCard({ style, children }: { style?: any; children: React.ReactNode }) {
  const scale = useSyncPulse();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

/** Validate / coerce input into HH:MM (24h). Returns null if invalid. */
function normalizeTime(input: string): string | null {
  const trimmed = input.trim();
  const m = /^(\d{1,2}):?(\d{0,2})$/.exec(trimmed);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = m[2] === '' ? 0 : parseInt(m[2], 10);
  if (isNaN(h) || h < 0 || h > 23) return null;
  if (isNaN(min) || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function moodLabelFromAvg(m: number | null): string {
  if (m === null) return '—';
  if (m >= 4.5) return 'Great';
  if (m >= 3.5) return 'Good';
  if (m >= 2.5) return 'OK';
  if (m >= 1.5) return 'Low';
  return 'Hard';
}

export default function ProfileScreen() {
  const name = useAuthStore((s) => s.user?.name ?? 'You');
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const { signOut } = useAuth();
  const { updateUser } = useAuthActions();
  const streak = useStreak();
  const sessions = useRecentSessions();
  const { loadStreak, loadRecentSessions } = useSessionStore.getState();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [notifCenterVisible, setNotifCenterVisible] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [exporting, setExporting] = useState(false);
  const notificationsEnabled = user?.notifications_enabled ?? true;
  const checkInTime = user?.check_in_time ?? '21:00';
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnread = useNotificationStore.getState().fetchNotifications;

  // Editable preset times — load from user.reminder_presets, fall back to defaults.
  const [presetTimes, setPresetTimes] = useState<Record<string, string>>(() => ({
    morning: user?.reminder_presets?.morning ?? '09:00',
    afternoon: user?.reminder_presets?.afternoon ?? '14:00',
    evening: user?.reminder_presets?.evening ?? '21:00',
  }));
  const [editingPreset, setEditingPreset] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  // Sync local state when user.reminder_presets changes (e.g. after profile reload).
  useEffect(() => {
    if (user?.reminder_presets) {
      setPresetTimes({
        morning: user.reminder_presets.morning ?? '09:00',
        afternoon: user.reminder_presets.afternoon ?? '14:00',
        evening: user.reminder_presets.evening ?? '21:00',
      });
    }
  }, [user?.reminder_presets]);

  const commitEdit = async () => {
    if (!editingPreset) return;
    const normalized = normalizeTime(editDraft);
    if (!normalized) {
      Alert.alert('Invalid time', 'Please enter a time like 08:30 or 21:00.');
      return;
    }
    const updatedPresets = { ...presetTimes, [editingPreset]: normalized };
    setPresetTimes(updatedPresets);
    try {
      await updateUser({ reminder_presets: updatedPresets });
    } catch (e) {
      console.warn('[profile] could not persist reminder presets', e);
    }
    // If the user edited the currently active preset, re-schedule the reminder.
    if (presetTimes[editingPreset] === checkInTime) {
      await updateCheckInTime(normalized);
    }
    setEditingPreset(null);
    setEditDraft('');
  };

  const cancelEdit = () => { setEditingPreset(null); setEditDraft(''); };

  useEffect(() => {
    if (!userId) return;
    fetchUnread(userId).catch(() => {});
  }, [userId, fetchUnread]);

  const toggleNotifications = async () => {
    if (savingNotif) return;
    setSavingNotif(true);
    try {
      const newEnabled = !notificationsEnabled;
      // If turning ON, request OS-level permission first
      if (newEnabled) {
        const token = await registerForPushNotifications();
        if (!token) {
          Alert.alert(
            'Permission needed',
            'Enable notifications in your device settings to get reminders from Stoppy.',
          );
          setSavingNotif(false);
          return;
        }
        await scheduleDailySessionReminder(checkInTime);
      } else {
        await cancelSessionReminder();
      }
      await updateUser({ notifications_enabled: newEnabled });
    } catch (e: any) {
      Alert.alert('Could not update', e?.message ?? String(e));
    } finally {
      setSavingNotif(false);
    }
  };

  const updateCheckInTime = async (newTime: string) => {
    try {
      await updateUser({ check_in_time: newTime });
      if (notificationsEnabled) {
        await scheduleDailySessionReminder(newTime);
      }
    } catch (e: any) {
      Alert.alert('Could not update', e?.message ?? String(e));
    }
  };

  const handleExportData = async () => {
    if (!userId || exporting) return;
    setExporting(true);
    try {
      const result = await exportUserDataAsCsv(userId);
      if (!result.shared) {
        Alert.alert('Export failed', result.error ?? 'Could not generate export.');
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? String(e));
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This will permanently delete all your data: sessions, moods, and your account. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            try {
              await deleteOwnAccount(userId);
              await signOut();
              router.replace('/');
            } catch (e: any) {
              Alert.alert('Deletion failed', e?.message ?? String(e));
            }
          },
        },
      ],
    );
  };

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      loadStreak(userId).catch(console.error);
      loadRecentSessions(userId).catch(console.error);
    }, [userId]),
  );

  const totalSessions = sessions.length;
  const totalSec = sessions.reduce((acc, s) => acc + (s.duration ?? 0), 0);
  const moodValid = sessions.filter((s) => s.mood_after).map((s) => s.mood_after as number);
  const avgMood = moodValid.length ? moodValid.reduce((a, b) => a + b, 0) / moodValid.length : null;

  const memberSince = (() => {
    const dStr = user?.created_at;
    if (!dStr) return '—';
    return new Date(dStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  })();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign out?',
      "You'll need to sign in again to access your sessions.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            // Fire-and-forget cleanup so a slow scheduler call can't hang the flow.
            cancelSessionReminder().catch(() => {});
            try {
              await signOut();
              // Belt-and-suspenders: auth listener in _layout.tsx will also navigate,
              // but if for any reason the event hasn't fired yet, push to root now.
              router.replace('/');
            } catch (e: any) {
              Alert.alert('Sign out failed', e?.message ?? String(e));
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <PurpleBg />

      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
      <PrivacyModal
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
        onExport={handleExportData}
        onDelete={handleDeleteAccount}
        exporting={exporting}
      />
      <HelpModal visible={helpVisible} onClose={() => setHelpVisible(false)} />
      <NotificationCenter visible={notifCenterVisible} onClose={() => setNotifCenterVisible(false)} />

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{name.split(' ')[0]}</Text>
          <Pressable style={styles.bellBtn} onPress={() => setNotifCenterVisible(true)}>
            <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
              <Path d="M9 2a5 5 0 015 5c0 3-1.5 5-5 7C5.5 12 4 10 4 7a5 5 0 015-5z" stroke="white" strokeWidth={1.8} />
              <Path d="M9 16a1.5 1.5 0 010-3" stroke="white" strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Hero */}
        <PulseCard style={styles.hero}>
          <Noit state="happy" size={90} glow={false} />
          <View style={{ flex: 1 }}>
            <Text style={styles.streak}>{streak} <Text style={{ fontSize: 24 }}>🔥</Text></Text>
            <Text style={styles.streakLbl}>
              {streak === 0 ? 'Start your first session ✦' : streak === 1 ? 'Day 1 — keep going!' : `Day streak — keep going!`}
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                ✦ {totalSessions} {totalSessions === 1 ? 'session' : 'sessions'} total
              </Text>
            </View>
          </View>
        </PulseCard>

        {/* Stats */}
        <View style={styles.stats}>
          <PulseCard style={styles.statCard}>
            <Text style={[styles.statVal, { color: '#1A8044' }]}>{moodLabelFromAvg(avgMood)}</Text>
            <Text style={styles.statLbl}>Avg. mood</Text>
          </PulseCard>
          <PulseCard style={styles.statCard}>
            <Text style={styles.statVal}>{formatDuration(totalSec)}</Text>
            <Text style={styles.statLbl}>Total time</Text>
          </PulseCard>
          <PulseCard style={styles.statCard}>
            <Text style={styles.statVal}>{memberSince}</Text>
            <Text style={styles.statLbl}>Member since</Text>
          </PulseCard>
        </View>

        {/* Settings menu */}
        <Text style={styles.section}>Settings</Text>
        <PulseCard style={styles.menu}>
          {/* Notifications — inline toggle + time picker */}
          <View style={styles.menuItem}>
            <View style={styles.menuIcon}><MenuSvg id="bell" /></View>
            <Text style={styles.menuLbl}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              disabled={savingNotif}
              trackColor={{ false: 'rgba(15,34,24,0.15)', true: '#38C97A' }}
              thumbColor="white"
              ios_backgroundColor="rgba(15,34,24,0.15)"
            />
          </View>
          {notificationsEnabled && (
            <View style={styles.timeSubItem}>
              <Text style={styles.timeSubLabel}>Reminder time</Text>
              <View style={styles.timeRow}>
                {DEFAULT_PRESETS.map((p) => {
                  const t = presetTimes[p.id];
                  const sel = checkInTime === t;
                  const editing = editingPreset === p.id;
                  if (editing) {
                    return (
                      <View key={p.id} style={[styles.timeChip, styles.timeChipSel]}>
                        <Text style={[styles.timeChipText, styles.timeChipTextSel]}>{p.label}</Text>
                        <TextInput
                          style={styles.timeChipInput}
                          value={editDraft}
                          onChangeText={setEditDraft}
                          placeholder="HH:MM"
                          placeholderTextColor="rgba(15,34,24,0.35)"
                          keyboardType="numbers-and-punctuation"
                          autoFocus
                          maxLength={5}
                          onSubmitEditing={commitEdit}
                          onBlur={commitEdit}
                          returnKeyType="done"
                        />
                      </View>
                    );
                  }
                  return (
                    <Pressable
                      key={p.id}
                      style={[styles.timeChip, sel && styles.timeChipSel]}
                      onPress={() => {
                        // First tap selects the card. Second tap on the SAME selected card opens edit.
                        if (sel) {
                          setEditingPreset(p.id);
                          setEditDraft(t);
                        } else {
                          updateCheckInTime(t);
                        }
                      }}
                      onLongPress={() => {
                        // Long-press always opens edit, even on unselected chips
                        setEditingPreset(p.id);
                        setEditDraft(t);
                      }}
                    >
                      <Text style={[styles.timeChipText, sel && styles.timeChipTextSel]}>
                        {p.label}
                      </Text>
                      <Text style={[styles.timeChipTime, sel && styles.timeChipTimeSel]}>
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.timeHint}>
                {editingPreset ? 'Type a time like 08:30 — done auto-saves' : 'Tap to select · long-press to edit'}
              </Text>
            </View>
          )}

          {/* Subscription */}
          <Pressable style={styles.menuItem} onPress={() => setPaywallVisible(true)}>
            <View style={styles.menuIcon}><MenuSvg id="star" /></View>
            <Text style={styles.menuLbl}>Subscription</Text>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path d="M6 4l4 4-4 4" stroke="rgba(15,34,24,0.3)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>

          {/* Privacy & data */}
          <Pressable style={styles.menuItem} onPress={() => setPrivacyVisible(true)}>
            <View style={styles.menuIcon}><MenuSvg id="lock" /></View>
            <Text style={styles.menuLbl}>Privacy & data</Text>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path d="M6 4l4 4-4 4" stroke="rgba(15,34,24,0.3)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>

          {/* Help & Support */}
          <Pressable style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setHelpVisible(true)}>
            <View style={styles.menuIcon}><MenuSvg id="info" /></View>
            <Text style={styles.menuLbl}>Help & Support</Text>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path d="M6 4l4 4-4 4" stroke="rgba(15,34,24,0.3)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </PulseCard>

        <Pressable onPress={handleSignOut} style={styles.signout}>
          <Text style={[styles.signoutText, { color: 'rgba(139,64,64,0.75)' }]}>Sign out</Text>
        </Pressable>
      </ScrollView>

      <TabBar />
    </View>
  );
}


/* ═════ Privacy & Help Modals — full-screen with PurpleBg (matches Subscription) ═════ */

function PrivacyModal({
  visible,
  onClose,
  onExport,
  onDelete,
  exporting,
}: {
  visible: boolean;
  onClose: () => void;
  onExport: () => void;
  onDelete: () => void;
  exporting: boolean;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#1F6B4D', overflow: 'hidden' }}>
        <PurpleBg />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={modalStyles.hero}>
            <Pressable onPress={onClose} style={modalStyles.backBtn}>
              <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                <Path d="M10 3L5 8l5 5" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
            <View style={modalStyles.heroLabel}>
              <Text style={modalStyles.heroLabelText}>✦ Privacy & Data</Text>
            </View>
            <View style={{ marginTop: 14 }}>
              <Noit state="curious" size={130} glow={false} />
            </View>
          </View>

          <View style={modalStyles.card}>
            <Text style={modalStyles.cardTitle}>
              You're in <Text style={modalStyles.cardTitleEm}>control</Text>
            </Text>
            <Text style={modalStyles.cardSub}>Your data, your rules. Always.</Text>

            <Text style={modalStyles.section}>What we collect</Text>
            <Text style={modalStyles.body}>
              • Your name and email (from Google sign-in){'\n'}
              • Your session conversations with Stoppy{'\n'}
              • Your urge entries and trigger patterns{'\n'}
              • Anonymous usage data to improve the app
            </Text>

            <Text style={modalStyles.section}>How we use it</Text>
            <Text style={modalStyles.body}>
              Your data helps Stoppy personalize sessions and notice patterns over time. We never share it with third parties or use it for ads. Your conversations stay between you and Stoppy.
            </Text>

            <Text style={modalStyles.section}>Your rights</Text>
            <Text style={modalStyles.body}>
              You can request a full export of your data, or delete your account and everything tied to it. Email us anytime.
            </Text>

            <Pressable
              style={[modalStyles.btnGhost, exporting && { opacity: 0.6 }]}
              onPress={onExport}
              disabled={exporting}
            >
              <Text style={modalStyles.btnGhostText}>
                {exporting ? 'Preparing export…' : 'Export my data (CSV)'}
              </Text>
            </Pressable>
            <Pressable style={modalStyles.btnDanger} onPress={onDelete}>
              <Text style={modalStyles.btnDangerText}>Delete my account</Text>
            </Pressable>

            <Pressable
              style={modalStyles.btnLink}
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}
            >
              <Text style={modalStyles.btnLinkText}>View full privacy policy →</Text>
            </Pressable>

            <Pressable style={modalStyles.btnCta} onPress={onClose}>
              <Text style={modalStyles.btnCtaText}>Got it</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const FAQ = [
  {
    q: 'How does Stoppy work?',
    a: 'When an urge hits, you tell Stoppy what set it off. Stoppy listens and helps you ride the wave instead of acting on it. It\'s not about willpower — it\'s about not being alone in the moment.',
  },
  {
    q: 'Why did my streak reset?',
    a: 'Streaks count consecutive days with at least one session. If you miss a full day, the streak restarts. Plus members get one streak freeze per month (coming soon).',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Conversations stay between you and Stoppy. We never sell or share your data. See Privacy & data for details.',
  },
  {
    q: 'Talk vs Breathe — which should I pick?',
    a: 'Talk is for when you want to be heard through the urge. Breathe is for moments when words feel like too much — just 5 minutes of slow breath to let the wave pass.',
  },
  {
    q: 'How do I contact support?',
    a: 'Email us at support@stoppy.app — we read every message.',
  },
];

function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#1F6B4D', overflow: 'hidden' }}>
        <PurpleBg />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={modalStyles.hero}>
            <Pressable onPress={onClose} style={modalStyles.backBtn}>
              <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                <Path d="M10 3L5 8l5 5" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
            <View style={modalStyles.heroLabel}>
              <Text style={modalStyles.heroLabelText}>✦ Help & Support</Text>
            </View>
            <View style={{ marginTop: 14 }}>
              <Noit state="happy" size={130} glow={false} />
            </View>
          </View>

          <View style={modalStyles.card}>
            <Text style={modalStyles.cardTitle}>
              How can I <Text style={modalStyles.cardTitleEm}>help?</Text>
            </Text>
            <Text style={modalStyles.cardSub}>Quick answers and how to reach us.</Text>

            <View style={{ marginTop: 16, gap: 10 }}>
              {FAQ.map((item, i) => (
                <View key={i} style={modalStyles.faqItem}>
                  <Text style={modalStyles.faqQ}>{item.q}</Text>
                  <Text style={modalStyles.faqA}>{item.a}</Text>
                </View>
              ))}
            </View>

            <View style={modalStyles.contactBox}>
              <Text style={modalStyles.contactTitle}>Still need help?</Text>
              <Text style={modalStyles.contactBody}>
                Email us at <Text style={{ fontWeight: '700', color: '#1A8044' }}>support@stoppy.app</Text> — we usually reply within 24 hours.
              </Text>
            </View>

            <Pressable style={modalStyles.btnCta} onPress={onClose}>
              <Text style={modalStyles.btnCtaText}>Got it</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function MenuSvg({ id }: { id: string }) {
  if (id === 'star') return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M9 2l2 5h5l-4 3 1.5 5L9 12l-4.5 3L6 10 2 7h5z" stroke="#1A8044" strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
  if (id === 'bell') return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M9 2a5 5 0 015 5c0 3-1.5 5-5 7C5.5 12 4 10 4 7a5 5 0 015-5z" stroke="#1A8044" strokeWidth={1.8} />
      <Path d="M9 16a1.5 1.5 0 010-3" stroke="#1A8044" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
  if (id === 'clock') return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Circle cx="9" cy="9" r="7" stroke="#1A8044" strokeWidth={1.8} />
      <Path d="M9 6v3l2 2" stroke="#1A8044" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
  if (id === 'lock') return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect x="3" y="3" width="12" height="12" rx="3" stroke="#1A8044" strokeWidth={1.8} />
      <Path d="M6 9h4" stroke="#1A8044" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Circle cx="9" cy="9" r="7" stroke="#1A8044" strokeWidth={1.8} />
      <Path d="M9 8v4M9 6h.01" stroke="#1A8044" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1F6B4D', overflow: 'hidden' },
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: 22, paddingTop: 60, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    gap: 12,
  },
  title: { flex: 1, fontSize: 27, fontWeight: '700', color: 'white' },
  bellBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#E05C5C',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: '#1F6B4D',
  },
  bellBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  timeSubItem: {
    paddingHorizontal: 18, paddingTop: 4, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(15,34,24,0.06)',
    marginTop: -1,
  },
  timeSubLabel: {
    fontSize: 11, fontWeight: '600', color: 'rgba(15,34,24,0.5)',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 4,
  },
  timeRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  timeChip: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10, paddingHorizontal: 6,
    backgroundColor: 'rgba(56,201,122,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(56,201,122,0.18)',
    borderRadius: 14, alignItems: 'center',
    overflow: 'hidden',
  },
  timeChipSel: {
    backgroundColor: 'rgba(56,201,122,0.18)',
    borderColor: '#38C97A',
  },
  timeChipText: { fontSize: 12, fontWeight: '600', color: 'rgba(15,34,24,0.65)' },
  timeChipTextSel: { color: '#0F2218' },
  timeChipTime: { fontSize: 11, fontWeight: '500', color: 'rgba(15,34,24,0.45)', marginTop: 2 },
  timeChipTimeSel: { color: '#1A8044', fontWeight: '700' },
  timeChipInput: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A8044',
    paddingVertical: 2,
    paddingHorizontal: 4,
    backgroundColor: 'white',
    borderRadius: 8,
    width: '100%',
    textAlign: 'center',
    marginTop: 2,
    includeFontPadding: false,
  },
  timeChipCancel: { fontSize: 11, color: 'rgba(15,34,24,0.5)', marginTop: 2 },
  timeHint: {
    fontSize: 10,
    color: 'rgba(15,34,24,0.4)',
    marginTop: 8,
    fontStyle: 'italic',
  },
  hero: {
    marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 26, paddingVertical: 22, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 18,
  },
  streak: { fontSize: 34, fontWeight: '700', color: '#0F2218', lineHeight: 36 },
  streakLbl: { fontSize: 13, color: 'rgba(15,34,24,0.55)', marginTop: 2 },
  badge: {
    backgroundColor: 'rgba(31,107,77,0.12)', borderRadius: 12,
    paddingVertical: 5, paddingHorizontal: 12, marginTop: 8, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#1A8044' },
  stats: { marginTop: 12, marginHorizontal: 18, flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20, paddingVertical: 14, alignItems: 'center', gap: 3,
  },
  statVal: { fontSize: 22, fontWeight: '700', color: '#0F2218' },
  statLbl: { fontSize: 11, color: 'rgba(15,34,24,0.5)', fontWeight: '500', textAlign: 'center' },
  section: {
    paddingHorizontal: 22, paddingTop: 20, paddingBottom: 10,
    fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.42)',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  menu: {
    marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22, overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 16, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(15,34,24,0.06)',
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: 'rgba(31,107,77,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuLbl: { flex: 1, fontSize: 15, fontWeight: '500', color: '#0F2218' },
  signout: {
    marginHorizontal: 18, marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20, paddingVertical: 15, alignItems: 'center',
  },
  signoutText: { fontSize: 15, fontWeight: '600', color: '#1A8044' },
});

const modalStyles = StyleSheet.create({
  hero: {
    height: 260,
    alignItems: 'center',
    paddingTop: 60,
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
  heroLabel: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 16,
  },
  heroLabelText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.9)',
  },
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
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F2218',
    textAlign: 'center',
    lineHeight: 30,
  },
  cardTitleEm: { color: '#38C97A' },
  cardSub: {
    fontSize: 13.5,
    color: 'rgba(15,34,24,0.52)',
    textAlign: 'center',
    marginTop: 6,
  },
  section: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A8044',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: 'rgba(15,34,24,0.85)',
    lineHeight: 22,
  },
  btnGhost: {
    marginTop: 22,
    backgroundColor: 'rgba(56,201,122,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,201,122,0.2)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnGhostText: { fontSize: 14, fontWeight: '700', color: '#1A8044' },
  btnDanger: {
    marginTop: 10,
    backgroundColor: 'rgba(224,92,92,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(224,92,92,0.2)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDangerText: { fontSize: 14, fontWeight: '700', color: '#B84545' },
  btnLink: { marginTop: 14, paddingVertical: 6, alignItems: 'center' },
  btnLinkText: { fontSize: 13, fontWeight: '600', color: '#38C97A' },
  btnCta: {
    marginTop: 22,
    paddingVertical: 18,
    backgroundColor: '#38C97A',
    borderRadius: 22,
    alignItems: 'center',
    shadowColor: '#38C97A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 8,
  },
  btnCtaText: { color: 'white', fontSize: 16, fontWeight: '700' },
  faqItem: {
    backgroundColor: 'rgba(56,201,122,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56,201,122,0.12)',
    borderRadius: 16,
    padding: 14,
  },
  faqQ: { fontSize: 14, fontWeight: '700', color: '#0F2218' },
  faqA: { fontSize: 13, color: 'rgba(15,34,24,0.7)', lineHeight: 20, marginTop: 5 },
  contactBox: {
    backgroundColor: 'rgba(56,201,122,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,201,122,0.2)',
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
  },
  contactTitle: { fontSize: 14, fontWeight: '700', color: '#0F2218' },
  contactBody: { fontSize: 13, color: 'rgba(15,34,24,0.7)', lineHeight: 20, marginTop: 4 },
});

