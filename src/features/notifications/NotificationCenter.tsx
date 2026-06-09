import React, { useCallback, useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ForestBg as PurpleBg } from '@/components/ForestBg';
import { useAuthStore } from '@/lib/auth-store';
import type { Notification, NotificationType } from '@/types';
import { useNotificationStore } from './notification-store';

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

const TYPE_ICON: Record<NotificationType, string> = {
  session_reminder: '🌊',
  daily_check_in: '💜',
  streak_milestone: '🔥',
};

const TYPE_COLOR: Record<NotificationType, string> = {
  session_reminder: '#38C97A',
  daily_check_in: '#5BB87E',
  streak_milestone: '#E69B3F',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function NotificationCenter({ visible, onClose }: NotificationCenterProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const notifications = useNotificationStore((s) => s.notifications);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const { fetchNotifications, markRead, markAllRead, deleteNotification } =
    useNotificationStore.getState();

  const refresh = useCallback(() => {
    if (!userId) return;
    fetchNotifications(userId).catch(console.error);
  }, [userId]);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const onItemPress = (n: Notification) => {
    if (!n.read) markRead(n.id).catch(console.error);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#1F6B4D', overflow: 'hidden' }}>
        <PurpleBg />

        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path d="M10 3L5 8l5 5" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <Text style={styles.title}>Notifications</Text>
          {notifications.some((n) => !n.read) ? (
            <Pressable onPress={() => userId && markAllRead(userId).catch(console.error)}>
              <Text style={styles.markAll}>Mark all read</Text>
            </Pressable>
          ) : (
            <View style={{ width: 80 }} />
          )}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {isLoading && notifications.length === 0 && (
            <Text style={styles.empty}>Loading…</Text>
          )}

          {!isLoading && notifications.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🌊</Text>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptyBody}>
                You'll see reminders, check-ins, and streak milestones here.
              </Text>
            </View>
          )}

          {notifications.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.item, !n.read && styles.itemUnread]}
              onPress={() => onItemPress(n)}
              onLongPress={() => deleteNotification(n.id).catch(console.error)}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${TYPE_COLOR[n.type]}20` }]}>
                <Text style={styles.icon}>{TYPE_ICON[n.type]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{n.title}</Text>
                  {!n.read && <View style={styles.dot} />}
                </View>
                <Text style={styles.itemBody} numberOfLines={2}>{n.message}</Text>
                <Text style={styles.itemTime}>{timeAgo(n.created_at)}</Text>
              </View>
            </Pressable>
          ))}

          {notifications.length > 0 && (
            <Text style={styles.hint}>Long-press to delete</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: 'white' },
  markAll: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  list: { paddingHorizontal: 18, paddingBottom: 40, gap: 10 },
  empty: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 40 },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 24, padding: 28, alignItems: 'center',
    marginTop: 40,
  },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F2218', marginBottom: 4 },
  emptyBody: { fontSize: 13, color: 'rgba(15,34,24,0.55)', textAlign: 'center', lineHeight: 19 },
  item: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 14,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  itemUnread: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: 'rgba(56,201,122,0.4)',
  },
  iconCircle: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F2218' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#38C97A' },
  itemBody: { fontSize: 13, color: 'rgba(15,34,24,0.7)', marginTop: 3, lineHeight: 18 },
  itemTime: { fontSize: 11, color: 'rgba(15,34,24,0.4)', marginTop: 6, fontWeight: '500' },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 12 },
});
