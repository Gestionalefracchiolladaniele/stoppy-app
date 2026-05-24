import { router, usePathname } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const ACTIVE = '#5C3E9C';
const INACTIVE = 'rgba(92,62,156,0.38)';

type TabDef = {
  id: string;
  label: string;
  href: string;
  icon: (active: boolean) => React.ReactNode;
};

const TABS: TabDef[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/(tabs)/home',
    icon: (active) => (
      <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
        <Path
          d="M3 10.5L11 3l8 7.5V19a1 1 0 01-1 1H14v-5H8v5H4a1 1 0 01-1-1z"
          fill={active ? ACTIVE : 'none'}
          stroke={active ? ACTIVE : INACTIVE}
          strokeWidth={2}
        />
      </Svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    href: '/(tabs)/history',
    icon: (active) => (
      <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
        <Rect x="3" y="3" width="16" height="16" rx="5" stroke={active ? ACTIVE : INACTIVE} strokeWidth={2} />
        <Path
          d="M7 11h8M7 8h5M7 14h6"
          stroke={active ? ACTIVE : INACTIVE}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    ),
  },
  {
    id: 'insights',
    label: 'Insights',
    href: '/(tabs)/insights',
    icon: (active) => (
      <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
        <Path
          d="M4 16l4-8 4 5 3-3 3 6"
          stroke={active ? ACTIVE : INACTIVE}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/(tabs)/profile',
    icon: (active) => (
      <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
        <Circle cx="11" cy="8" r="4" fill={active ? ACTIVE : 'none'} stroke={active ? ACTIVE : INACTIVE} strokeWidth={2} />
        <Path
          d="M4 19c0-3.9 3.1-7 7-7h0c3.9 0 7 3.1 7 7"
          stroke={active ? ACTIVE : INACTIVE}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    ),
  },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <View style={styles.bar}>
      {TABS.map((t) => {
        const active = pathname.includes(t.id);
        return (
          <Pressable
            key={t.id}
            style={styles.tab}
            onPress={() => router.replace(t.href as any)}
          >
            {t.icon(active)}
            <Text style={[styles.label, active && { color: ACTIVE }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 88,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.62)',
    flexDirection: 'row',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: INACTIVE,
  },
});
