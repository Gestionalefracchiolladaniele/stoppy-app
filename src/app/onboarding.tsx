import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Stoppy as Noit } from '@/components/Stoppy';
import { PaywallSheet } from '@/components/PaywallModal';
import { ForestBg as PurpleBg } from '@/components/ForestBg';
import { useAuthStore } from '@/lib/auth-store';
import type { CravingTime, FeelingTopic } from '@/types';

type StepIdx = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const TOPICS: { id: FeelingTopic; label: string }[] = [
  { id: 'anxiety', label: 'Anxiety' },
  { id: 'boredom', label: 'Boredom' },
  { id: 'stress', label: 'Stress' },
  { id: 'tiredness', label: 'Tiredness' },
  { id: 'loneliness', label: 'Loneliness' },
  { id: 'frustration', label: 'Frustration' },
  { id: 'sadness', label: 'Sadness' },
  { id: 'emptiness', label: 'Emptiness' },
  { id: 'restlessness', label: 'Restlessness' },
  { id: 'overwhelm', label: 'Overwhelm' },
];

const CRAVING_TIMES: { id: CravingTime; icon: string; name: string; desc: string }[] = [
  { id: 'morning', icon: '🌅', name: 'Morning', desc: '7 – 10 AM · Start clear' },
  { id: 'afternoon', icon: '☀️', name: 'Afternoon', desc: '12 – 5 PM · Mid-day urges' },
  { id: 'evening', icon: '🌙', name: 'Evening', desc: '7 – 11 PM · Late-night urges' },
];

const currentYear = new Date().getFullYear();

export default function OnboardingScreen() {
  const updateUser = useAuthStore((s) => s.updateUser);

  const [step, setStep] = useState<StepIdx>(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const setStepDir = (next: StepIdx) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [cravingTime, setCravingTime] = useState<CravingTime>('afternoon');
  const [topics, setTopics] = useState<FeelingTopic[]>([]);
  const [disclaimerMedical, setDisclaimerMedical] = useState(false);
  const [disclaimerAge, setDisclaimerAge] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleContinueName = () => {
    if (!name.trim()) {
      Alert.alert('Almost there', 'What should Stoppy call you?');
      return;
    }
    const year = parseInt(birthYear, 10);
    if (!year || year < 1900 || year > currentYear) {
      Alert.alert('Birth year', 'Please enter a valid birth year');
      return;
    }
    const age = currentYear - year;
    if (age < 18) {
      Alert.alert(
        'Stoppy is for adults',
        "Stoppy is for ages 18 and up. Come back when you're ready 🌿",
      );
      return;
    }
    setStepDir(3);
  };

  const toggleTopic = (id: FeelingTopic) => {
    setTopics((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleAcceptDisclaimer = () => {
    if (!disclaimerMedical || !disclaimerAge) {
      Alert.alert('Please confirm', 'Both checkboxes are required to continue');
      return;
    }
    setStepDir(6);
  };

  const handleStartTrial = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateUser({
        name: name.trim(),
        birth_year: parseInt(birthYear, 10),
        craving_time: cravingTime,
        topics,
        disclaimer_accepted: true,
        subscription_status: 'plus',
        role_completed: true,
      });
      router.replace('/(tabs)/home');
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error('[onboarding] save failed:', msg);
      Alert.alert(
        'Could not save profile',
        `${msg}\n\nMake sure you ran supabase/schema.sql in your Supabase SQL Editor.`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <PurpleBg />
      <SlideStep key={step} direction={direction}>
        {step === 0 && <Step1Welcome onNext={() => setStepDir(1)} />}
        {step === 1 && (
          <Step2HowItWorks onBack={() => setStepDir(0)} onNext={() => setStepDir(2)} />
        )}
        {step === 2 && (
          <Step3Name
            onBack={() => setStepDir(1)}
            name={name}
            setName={setName}
            birthYear={birthYear}
            setBirthYear={setBirthYear}
            onNext={handleContinueName}
          />
        )}
        {step === 3 && (
          <Step4Time
            onBack={() => setStepDir(2)}
            value={cravingTime}
            setValue={setCravingTime}
            onNext={() => setStepDir(4)}
          />
        )}
        {step === 4 && (
          <Step5Topics
            onBack={() => setStepDir(3)}
            topics={topics}
            toggle={toggleTopic}
            onNext={() => setStepDir(5)}
          />
        )}
        {step === 5 && (
          <Step6Disclaimer
            onBack={() => setStepDir(4)}
            age={disclaimerAge}
            setAge={setDisclaimerAge}
            medical={disclaimerMedical}
            setMedical={setDisclaimerMedical}
            onNext={handleAcceptDisclaimer}
          />
        )}
        {step === 6 && (
          <Step7Paywall
            onBack={() => setStepDir(5)}
            onStart={handleStartTrial}
            saving={saving}
          />
        )}
      </SlideStep>
    </View>
  );
}

function SlideStep({ children, direction }: { children: React.ReactNode; direction: 1 | -1 }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 460,
      // cubic-bezier(0.4, 0, 0.2, 1) — stesso del design HTML
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, []);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [direction * 60, 0],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.4, 1],
  });

  return (
    <Animated.View
      style={{
        flex: 1,
        transform: [{ translateX }],
        opacity,
      }}
    >
      {children}
    </Animated.View>
  );
}


/* ═════════════ STEP 1 ═════════════ */
function Step1Welcome({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.page}>
      <View style={{ marginTop: 40 }}>
        <Noit state="idle" size={200} />
      </View>
      <Text style={styles.eyebrow}>Your daily companion</Text>
      <Text style={styles.headline}>
        Hi, I'm <Text style={styles.headlineEm}>Stoppy</Text>.{'\n'}Nice to meet you.
      </Text>
      <Text style={styles.sub}>
        A calm daily ritual for when the urge hits — through conversation, breath, and a steady
        presence that sits with you.
      </Text>
      <Dots active={0} total={7} />
      <View style={styles.actions}>
        <BtnMain label="Get Started" onPress={onNext} />
      </View>
    </View>
  );
}

/* ═════════════ STEP 2 ═════════════ */
function Step2HowItWorks({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <View style={styles.page}>
      <BackBtn onPress={onBack} />
      <View style={{ marginTop: 32, alignSelf: 'flex-end', marginRight: -4 }}>
        <Noit state="happy" size={110} />
      </View>
      <Text style={[styles.eyebrow, { alignSelf: 'flex-start', marginTop: 6 }]}>
        Here's how it works
      </Text>
      <Text
        style={[
          styles.headline,
          { fontSize: 26, textAlign: 'left', alignSelf: 'flex-start', marginTop: 6 },
        ]}
      >
        Three things.{'\n'}
        <Text style={styles.headlineEm}>Ten minutes.</Text> Every day.
      </Text>
      <View style={styles.features}>
        <FeatureCard
          tint="a"
          title="Daily Check-in"
          desc="A short session every day — morning, noon, or evening."
          icon={
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="9" stroke="#38C97A" strokeWidth={2} />
              <Path d="M12 8v4l3 3" stroke="#38C97A" strokeWidth={2} strokeLinecap="round" />
            </Svg>
          }
        />
        <FeatureCard
          tint="b"
          title="Talk to Stoppy"
          desc="Share what set off the urge. Stoppy listens and helps you ride it out."
          icon={
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Rect x="3" y="3" width="18" height="18" rx="5" stroke="rgba(80,200,160,0.9)" strokeWidth={2} />
              <Path
                d="M8 12h8M8 8h5M8 16h6"
                stroke="rgba(80,200,160,0.9)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          }
        />
        <FeatureCard
          tint="c"
          title="Track your mood"
          desc="See patterns, celebrate progress, grow over time."
          icon={
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 3l2.5 5.5L21 9.5l-4.5 4 1 6.5L12 17l-5.5 3 1-6.5L3 9.5l6.5-1z"
                stroke="rgba(220,150,60,0.9)"
                strokeWidth={2}
                strokeLinejoin="round"
              />
            </Svg>
          }
        />
      </View>
      <Dots active={1} total={7} />
      <View style={[styles.actions, { paddingTop: 12 }]}>
        <BtnMain label="Let's begin" onPress={onNext} />
      </View>
    </View>
  );
}

/* ═════════════ STEP 3 ═════════════ */
function Step3Name({
  onBack,
  name,
  setName,
  birthYear,
  setBirthYear,
  onNext,
}: {
  onBack: () => void;
  name: string;
  setName: (v: string) => void;
  birthYear: string;
  setBirthYear: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <BackBtn onPress={onBack} />
      <View style={{ marginTop: 38 }}>
        <Noit state="curious" size={148} />
      </View>
      <Text style={[styles.headline, { fontSize: 27, marginTop: 10 }]}>
        What should{'\n'}I call you?
      </Text>
      <Text style={[styles.sub, { marginTop: 6 }]}>I'll remember it for every session.</Text>
      <TextInput
        style={styles.nameInput}
        placeholder="Your name…"
        placeholderTextColor="rgba(15,34,24,0.3)"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <TextInput
        style={[styles.nameInput, { marginTop: 12 }]}
        placeholder="Birth year (e.g. 2000)"
        placeholderTextColor="rgba(15,34,24,0.3)"
        value={birthYear}
        onChangeText={(v) => setBirthYear(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
      />
      <Text style={styles.nameHint}>Stoppy is for ages 18+ · stays private 🤫</Text>
      <Dots active={2} total={7} />
      <View style={styles.actions}>
        <BtnMain label="Continue" onPress={onNext} />
      </View>
    </KeyboardAvoidingView>
  );
}

/* ═════════════ STEP 4 ═════════════ */
function Step4Time({
  onBack,
  value,
  setValue,
  onNext,
}: {
  onBack: () => void;
  value: CravingTime;
  setValue: (v: CravingTime) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.page}>
      <BackBtn onPress={onBack} />
      <View style={{ marginTop: 30, alignSelf: 'flex-start', marginLeft: 8 }}>
        <Noit state="wink" size={100} />
      </View>
      <Text
        style={[
          styles.headline,
          { fontSize: 26, marginTop: 10, alignSelf: 'flex-start', textAlign: 'left' },
        ]}
      >
        When does the{'\n'}urge hit hardest?
      </Text>
      <Text style={[styles.sub, { textAlign: 'left', alignSelf: 'flex-start', marginTop: 6 }]}>
        Pick the time that feels most familiar.
      </Text>
      <View style={styles.timeCards}>
        {CRAVING_TIMES.map((t) => {
          const sel = value === t.id;
          return (
            <Pressable
              key={t.id}
              style={[styles.timeCard, sel && styles.timeCardSel]}
              onPress={() => setValue(t.id)}
            >
              <View style={[styles.timeIcon, sel && styles.timeIconSel]}>
                <Text style={{ fontSize: 22 }}>{t.icon}</Text>
              </View>
              <View>
                <Text style={[styles.timeName, sel ? styles.timeNameSel : styles.timeNameDef]}>
                  {t.name}
                </Text>
                <Text style={[styles.timeDesc, sel ? styles.timeDescSel : styles.timeDescDef]}>
                  {t.desc}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Dots active={3} total={7} />
      <View style={styles.actions}>
        <BtnMain label="Continue" onPress={onNext} />
      </View>
    </View>
  );
}

/* ═════════════ STEP 5 ═════════════ */
function Step5Topics({
  onBack,
  topics,
  toggle,
  onNext,
}: {
  onBack: () => void;
  topics: FeelingTopic[];
  toggle: (id: FeelingTopic) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.page}>
      <BackBtn onPress={onBack} />
      <View style={{ marginTop: 34 }}>
        <Noit state="excited" size={134} />
      </View>
      <Text style={[styles.headline, { fontSize: 26, marginTop: 10 }]}>
        What do you feel{'\n'}most often?
      </Text>
      <Text style={[styles.sub, { marginTop: 6 }]}>
        Pick the feelings that tend to trigger the urge — you can change this later.
      </Text>
      <View style={styles.chipsWrap}>
        {TOPICS.map((t) => {
          const sel = topics.includes(t.id);
          return (
            <Pressable
              key={t.id}
              style={[styles.chip, sel && styles.chipSel]}
              onPress={() => toggle(t.id)}
            >
              <Text style={[styles.chipText, sel && styles.chipTextSel]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Dots active={4} total={7} />
      <View style={styles.actions}>
        <BtnMain label="Continue ✦" onPress={onNext} />
      </View>
    </View>
  );
}

/* ═════════════ STEP 6 ═════════════ */
function Step6Disclaimer({
  onBack,
  age,
  setAge,
  medical,
  setMedical,
  onNext,
}: {
  onBack: () => void;
  age: boolean;
  setAge: (v: boolean) => void;
  medical: boolean;
  setMedical: (v: boolean) => void;
  onNext: () => void;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.page, { flexGrow: 1 }]}
      showsVerticalScrollIndicator={false}
    >
      <BackBtn onPress={onBack} />
      <View style={{ marginTop: 30 }}>
        <Noit state="idle" size={110} />
      </View>
      <Text style={[styles.headline, { fontSize: 25, marginTop: 14 }]}>One last{'\n'}thing.</Text>
      <Text style={[styles.sub, { marginTop: 6 }]}>Before we begin, please confirm:</Text>

      <View style={styles.disclaimerWrap}>
        <Pressable style={styles.checkRow} onPress={() => setAge(!age)}>
          <View style={[styles.checkbox, age && styles.checkboxOn]}>
            {age && (
              <Svg width={14} height={14} viewBox="0 0 12 12" fill="none">
                <Path
                  d="M2 6l3 3 5-5"
                  stroke="white"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            )}
          </View>
          <Text style={styles.checkText}>
            I confirm I am <Text style={{ fontWeight: '700' }}>18 or older</Text>.
          </Text>
        </Pressable>

        <Pressable style={styles.checkRow} onPress={() => setMedical(!medical)}>
          <View style={[styles.checkbox, medical && styles.checkboxOn]}>
            {medical && (
              <Svg width={14} height={14} viewBox="0 0 12 12" fill="none">
                <Path
                  d="M2 6l3 3 5-5"
                  stroke="white"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            )}
          </View>
          <Text style={styles.checkText}>
            I understand Stoppy is{' '}
            <Text style={{ fontWeight: '700' }}>not a medical service</Text> and does not replace
            professional advice.
          </Text>
        </Pressable>
      </View>

      <Dots active={5} total={7} />
      <View style={styles.actions}>
        <BtnMain label="Continue" onPress={onNext} disabled={!age || !medical} />
      </View>
    </ScrollView>
  );
}

/* ═════════════ STEP 7 — Paywall integrato ═════════════ */
function Step7Paywall({
  onBack,
  onStart,
  saving,
}: {
  onBack: () => void;
  onStart: () => void;
  saving: boolean;
}) {
  return <PaywallSheet onStart={onStart} onBack={onBack} saving={saving} />;
}

/* ═════════════ Shared components ═════════════ */

function BtnMain({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.btnMain, disabled && { opacity: 0.45 }]}
    >
      <Text style={styles.btnMainText}>{label}</Text>
    </Pressable>
  );
}

function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.backBtn}>
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
  );
}

function Dots({ active, total }: { active: number; total: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i === active ? styles.dotOn : styles.dotOff]} />
      ))}
    </View>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  tint,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tint: 'a' | 'b' | 'c';
}) {
  const bg =
    tint === 'a'
      ? 'rgba(56,201,122,0.25)'
      : tint === 'b'
        ? 'rgba(58,142,124,0.25)'
        : 'rgba(200,130,60,0.22)';
  return (
    <View style={styles.featCard}>
      <View style={[styles.featIcon, { backgroundColor: bg }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featTitle}>{title}</Text>
        <Text style={styles.featDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1F6B4D',
    overflow: 'hidden',
  },
  glowTop: {
    display: 'none',
  },
  page: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingTop: 60,
    paddingBottom: 36,
    position: 'relative',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.52)',
    marginTop: 14,
  },
  headline: {
    fontSize: 30,
    fontWeight: '700',
    color: 'white',
    lineHeight: 36,
    textAlign: 'center',
    marginTop: 8,
  },
  headlineEm: {
    color: 'rgba(255,255,255,0.72)',
  },
  sub: {
    fontSize: 14.5,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 288,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  dotOn: {
    width: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  dotOff: {
    width: 7,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  actions: {
    width: '100%',
    marginTop: 'auto',
    paddingTop: 16,
  },
  btnMain: {
    width: '100%',
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 8,
  },
  btnMainText: {
    color: '#1A8044',
    fontSize: 17,
    fontWeight: '700',
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
  features: {
    width: '100%',
    flexDirection: 'column',
    gap: 9,
    marginTop: 14,
  },
  featCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 17,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: 'white',
  },
  featDesc: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.52)',
    lineHeight: 17,
    marginTop: 2,
  },
  nameInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 22,
    fontSize: 18,
    color: '#0F2218',
    textAlign: 'center',
    marginTop: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 4,
  },
  nameHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.38)',
    textAlign: 'center',
    marginTop: 8,
  },
  timeCards: {
    width: '100%',
    flexDirection: 'column',
    gap: 9,
    marginTop: 20,
  },
  timeCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  timeCardSel: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(255,255,255,0.9)',
  },
  timeIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeIconSel: {
    backgroundColor: 'rgba(31,107,77,0.1)',
  },
  timeName: {
    fontSize: 15,
    fontWeight: '600',
  },
  timeNameDef: { color: 'white' },
  timeNameSel: { color: '#0F2218' },
  timeDesc: {
    fontSize: 12.5,
    marginTop: 1,
  },
  timeDescDef: { color: 'rgba(255,255,255,0.48)' },
  timeDescSel: { color: 'rgba(15,34,24,0.52)' },
  chipsWrap: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  chipSel: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(255,255,255,0.9)',
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
  },
  chipTextSel: {
    color: '#1A8044',
    fontWeight: '600',
  },
  disclaimerWrap: {
    width: '100%',
    marginTop: 22,
    gap: 12,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    padding: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: '#38C97A',
    borderColor: '#38C97A',
  },
  checkText: {
    flex: 1,
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
});

