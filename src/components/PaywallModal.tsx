import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Stoppy as Noit } from '@/components/Stoppy';
import { ForestBg as PurpleBg } from '@/components/ForestBg';

type Plan = 'annual' | 'monthly';

const PLANS: Record<Plan, { name: string; desc: string; price: string; per: string }> = {
  annual: { name: 'Annual', desc: 'Billed once a year', price: '€3.99', per: '/mo' },
  monthly: { name: 'Monthly', desc: 'Billed every month', price: '€7.99', per: '/mo' },
};

const PERKS = [
  'Unlimited daily sessions with Stoppy',
  'Deep urge insights & weekly reports',
  'Personalized Stoppy look & name',
];

interface PaywallSheetProps {
  onStart: () => void | Promise<void>;
  onBack?: () => void;
  saving?: boolean;
}

function PaywallSheet({ onStart, onBack, saving = false }: PaywallSheetProps) {
  const [plan, setPlan] = useState<Plan>('monthly');

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path d="M10 3L5 8l5 5" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        )}
        <View style={styles.heroLabel}>
          <Text style={styles.heroLabelText}>✦ Stoppy Premium</Text>
        </View>
        <View style={{ marginTop: 6 }}>
          <Noit state="happy" size={150} crown />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Unlock <Text style={styles.cardTitleEm}>full Stoppy</Text>
        </Text>
        <Text style={styles.cardSub}>Start free for 7 days. Cancel anytime.</Text>

        <View style={styles.plans}>
          <Pressable
            style={[styles.plan, plan === 'annual' && styles.planSelected]}
            onPress={() => setPlan('annual')}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Best value</Text>
            </View>
            <View>
              <Text style={styles.planName}>{PLANS.annual.name}</Text>
              <Text style={styles.planDesc}>{PLANS.annual.desc}</Text>
            </View>
            <Text style={styles.planPrice}>
              {PLANS.annual.price}
              <Text style={styles.planPer}> {PLANS.annual.per}</Text>
            </Text>
          </Pressable>

          <Pressable
            style={[styles.plan, plan === 'monthly' && styles.planSelected]}
            onPress={() => setPlan('monthly')}
          >
            <View>
              <Text style={styles.planName}>{PLANS.monthly.name}</Text>
              <Text style={styles.planDesc}>{PLANS.monthly.desc}</Text>
            </View>
            <Text style={styles.planPrice}>
              {PLANS.monthly.price}
              <Text style={styles.planPer}> {PLANS.monthly.per}</Text>
            </Text>
          </Pressable>
        </View>

        <View style={styles.perks}>
          {PERKS.map((p) => (
            <View key={p} style={styles.perkRow}>
              <View style={styles.perkDot}>
                <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                  <Path d="M2 6l3 3 5-5" stroke="#38C97A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <Text style={styles.perkText}>{p}</Text>
            </View>
          ))}
        </View>

        <Pressable style={[styles.btnCta, saving && { opacity: 0.6 }]} onPress={onStart} disabled={saving}>
          <Text style={styles.btnCtaText}>{saving ? 'Setting up…' : 'Start 7-day free trial'}</Text>
        </Pressable>
        <Text style={styles.legal}>No charge today · Renews automatically · Cancel anytime</Text>
      </View>
    </ScrollView>
  );
}

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PaywallModal({ visible, onClose }: PaywallModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#1F6B4D', overflow: 'hidden' }}>
        <PurpleBg />
        <PaywallSheet onStart={onClose} onBack={onClose} />
      </View>
    </Modal>
  );
}

export { PaywallSheet };

const styles = StyleSheet.create({
  hero: {
    height: 270,
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
    paddingTop: 22,
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
  plans: { marginTop: 18, gap: 10 },
  plan: {
    borderWidth: 1.5,
    borderColor: 'rgba(56,201,122,0.2)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.7)',
    position: 'relative',
  },
  planSelected: {
    borderColor: '#38C97A',
    backgroundColor: 'rgba(56,201,122,0.08)',
  },
  planName: { fontSize: 15, fontWeight: '600', color: '#0F2218' },
  planDesc: { fontSize: 12, color: 'rgba(15,34,24,0.5)', marginTop: 2 },
  planPrice: { fontSize: 17, fontWeight: '700', color: '#1A8044' },
  planPer: { fontSize: 12, fontWeight: '400', color: 'rgba(15,34,24,0.5)' },
  badge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#38C97A',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: 'white',
    textTransform: 'uppercase',
  },
  perks: { marginTop: 18, gap: 8 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perkDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(31,107,77,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(31,107,77,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: { fontSize: 13.5, color: 'rgba(15,34,24,0.78)' },
  btnCta: {
    marginTop: 16,
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
  btnCtaText: { color: 'white', fontSize: 17, fontWeight: '700' },
  legal: {
    fontSize: 11,
    color: 'rgba(15,34,24,0.4)',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 10,
  },
});
