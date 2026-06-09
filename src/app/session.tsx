import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Stoppy as Noit } from '@/components/Stoppy';
import { StoppyMini as NoitMini, stoppyVariantForIntensity as noitVariantForMood } from '@/components/StoppyMini';
import { ForestBg as PurpleBg } from '@/components/ForestBg';
import { useAuthStore } from '@/lib/auth-store';
import { CRISIS_MESSAGE, useActiveSession, useSessionStore } from '@/lib/session-store';
import type { CravingMode, Mood, StoppyState } from '@/types';

type Phase = 'food' | 'mood' | 'choice' | 'active' | 'end-mood' | 'reflect' | 'end';

export default function SessionScreen() {
  const [phase, setPhase] = useState<Phase>('food');
  const [food, setFood] = useState('');
  const [moodBefore, setMoodBefore] = useState<Mood | null>(null);
  const [moodAfter, setMoodAfter] = useState<Mood | null>(null);
  const [mode, setMode] = useState<CravingMode>('feed');
  const [reflection, setReflection] = useState('');
  const [starting, setStarting] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const userId = useAuthStore((s) => s.user?.id);
  const { startSession, reset, discardActiveSession } = useSessionStore.getState();

  const close = () => {
    reset();
    router.replace('/(tabs)/home');
  };

  const requestExitActive = () => setExitConfirm(true);
  const confirmExit = () => {
    setExitConfirm(false);
    // Discard active (not-yet-finalized) session: deletes the DB row created on startSession
    discardActiveSession().catch(console.warn);
    router.replace('/(tabs)/home');
  };
  const dismissExit = () => setExitConfirm(false);

  const onStart = async (selectedMode: CravingMode) => {
    if (!userId) {
      Alert.alert('Account error', 'No user account found. Please sign out and sign in again.');
      return;
    }
    if (starting || !moodBefore) return;
    setStarting(true);
    setMode(selectedMode);
    try {
      await startSession({
        userId,
        trigger: food.trim() || 'urge',
        mode: selectedMode,
        mood_before: moodBefore,
      });
      setPhase('active');
    } catch (e: any) {
      Alert.alert('Could not start session', e?.message ?? String(e));
    } finally {
      setStarting(false);
    }
  };

  if (phase === 'food') return <TriggerPicker onBack={close} food={food} setFood={setFood} onNext={() => setPhase('mood')} />;
  if (phase === 'mood')
    return (
      <MoodPicker
        title="How strong is the urge?"
        onBack={() => setPhase('food')}
        value={moodBefore}
        setValue={setMoodBefore}
        onNext={() => setPhase('choice')}
      />
    );
  if (phase === 'choice')
    return (
      <ChoiceScreen
        onBack={() => setPhase('mood')}
        onContinue={(m) => onStart(m)}
        starting={starting}
      />
    );
  if (phase === 'end-mood')
    return (
      <MoodPicker
        title="How strong is the urge now?"
        onBack={() => setPhase('active')}
        value={moodAfter}
        setValue={setMoodAfter}
        onNext={() => setPhase(mode === 'breathe' ? 'reflect' : 'end')}
      />
    );
  if (phase === 'reflect' && moodAfter)
    return (
      <ReflectScreen
        moodBefore={moodBefore}
        moodAfter={moodAfter}
        reflection={reflection}
        setReflection={setReflection}
        onBack={() => setPhase('end-mood')}
        onNext={() => setPhase('end')}
      />
    );
  if (phase === 'end' && moodAfter)
    return <EndScreen moodAfter={moodAfter} mode={mode} reflection={reflection} onClose={close} />;

  const activeScreen = mode === 'breathe'
    ? <BreatheScreen onBack={requestExitActive} onComplete={() => setPhase('end-mood')} />
    : <ChatScreen onEnd={() => setPhase('end-mood')} onBack={requestExitActive} />;

  return (
    <>
      {activeScreen}
      <ExitConfirmModal visible={exitConfirm} mode={mode} onKeep={dismissExit} onExit={confirmExit} />
    </>
  );
}

function ExitConfirmModal({
  visible,
  mode,
  onKeep,
  onExit,
}: {
  visible: boolean;
  mode: CravingMode;
  onKeep: () => void;
  onExit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeep}>
      <Pressable style={exitStyles.backdrop} onPress={onKeep}>
        <Pressable style={exitStyles.card} onPress={(e) => e.stopPropagation()}>
          <View style={exitStyles.iconWrap}>
            <Noit state="curious" size={64} glow={false} />
          </View>
          <Text style={exitStyles.title}>Leave session?</Text>
          <Text style={exitStyles.body}>
            Your current {mode === 'breathe' ? 'breathing' : 'conversation'} won't be saved and will be lost.
          </Text>
          <Pressable style={exitStyles.btnKeep} onPress={onKeep}>
            <Text style={exitStyles.btnKeepText}>Keep going</Text>
          </Pressable>
          <Pressable style={exitStyles.btnExit} onPress={onExit}>
            <Text style={exitStyles.btnExitText}>Exit without saving</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const exitStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7,13,9,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 26,
    paddingTop: 22,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 36,
    elevation: 12,
  },
  iconWrap: { marginTop: 0 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F2218',
    marginTop: 4,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: 'rgba(15,34,24,0.62)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 6,
  },
  btnKeep: {
    marginTop: 20,
    width: '100%',
    backgroundColor: '#38C97A',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#38C97A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
  btnKeepText: { color: 'white', fontSize: 15, fontWeight: '700' },
  btnExit: {
    marginTop: 10,
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnExitText: { color: 'rgba(139,64,64,0.85)', fontSize: 14, fontWeight: '600' },
});

/* ═════ TRIGGER PICKER ═════ */
const TRIGGER_PRESETS: { key: string; label: string; icon: string }[] = [
  { key: 'phone', label: 'Phone / scrolling', icon: '📱' },
  { key: 'night', label: 'Late at night', icon: '🌙' },
  { key: 'stress', label: 'Stressed', icon: '😮‍💨' },
  { key: 'boredom', label: 'Bored', icon: '🥱' },
  { key: 'loneliness', label: 'Lonely', icon: '🫥' },
  { key: 'tiredness', label: 'Tired', icon: '😴' },
];

function TriggerPicker({
  onBack,
  food,
  setFood,
  onNext,
}: {
  onBack: () => void;
  food: string;
  setFood: (v: string) => void;
  onNext: () => void;
}) {
  // A preset is selected when `food` matches one of the labels. Otherwise the
  // user is in "Other" mode: either they tapped Other, or they typed something
  // that isn't a preset (e.g. coming back to this screen with a custom value).
  const matchedPreset = TRIGGER_PRESETS.find(
    (t) => t.label.toLowerCase() === food.trim().toLowerCase(),
  );
  const [otherMode, setOtherMode] = useState(!!food.trim() && !matchedPreset);
  const otherSelected = otherMode || (!!food.trim() && !matchedPreset);

  const selectPreset = (label: string) => {
    setOtherMode(false);
    setFood(label);
  };
  const selectOther = () => {
    // Switching to Other clears any preset value so the input starts empty.
    if (matchedPreset) setFood('');
    setOtherMode(true);
  };

  return (
    <View style={styles.screen}>
      <PurpleBg />
      <Pressable style={styles.backBtnTL} onPress={onBack}>
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Path d="M10 3L5 8l5 5" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ marginTop: 8 }}>
            <Noit state="curious" size={108} />
          </View>
          <Text style={styles.title}>What set off{'\n'}the urge?</Text>
          <Text style={styles.sub}>Pick what fits.</Text>

          <View style={styles.triggerGrid}>
            {TRIGGER_PRESETS.map((t) => {
              const sel = !otherSelected && matchedPreset?.key === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => selectPreset(t.label)}
                  style={[styles.triggerCell, sel && styles.triggerCellSel]}
                >
                  <Text style={styles.triggerIcon}>{t.icon}</Text>
                  <Text style={[styles.triggerLabel, sel && styles.triggerLabelSel]} numberOfLines={1}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}

            {/* Other — selectable like the rest; when selected the card itself
                becomes the text field (type directly on the card). */}
            <Pressable
              onPress={selectOther}
              style={[styles.triggerCell, styles.triggerCellOther, otherSelected && styles.triggerCellSel]}
            >
              <Text style={styles.triggerIcon}>✏️</Text>
              {otherSelected ? (
                <TextInput
                  style={styles.triggerInput}
                  placeholder="Type what set it off…"
                  placeholderTextColor="rgba(15,34,24,0.34)"
                  value={food}
                  onChangeText={setFood}
                  autoFocus
                  returnKeyType="done"
                />
              ) : (
                <Text style={styles.triggerLabel} numberOfLines={1}>
                  Other
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.btnMain, !food.trim() && { opacity: 0.5 }]}
              onPress={onNext}
              disabled={!food.trim()}
            >
              <Text style={styles.btnMainText}>Continue</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ═════ MOOD PICKER ═════ */
const MOOD_OPTS: { m: Mood; label: string }[] = [
  { m: 1, label: 'Barely' },
  { m: 2, label: 'Mild' },
  { m: 3, label: 'Medium' },
  { m: 4, label: 'Strong' },
  { m: 5, label: 'Intense' },
];

function MoodPicker({
  title,
  onBack,
  value,
  setValue,
  onNext,
}: {
  title: string;
  onBack: () => void;
  value: Mood | null;
  setValue: (m: Mood) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.screen}>
      <PurpleBg />
      <Pressable style={styles.backBtnTL} onPress={onBack}>
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Path d="M10 3L5 8l5 5" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: 30 }}>
          {/* The big Stoppy mirrors the selected urge level (idle until you pick). */}
          <Noit state={value ? noitVariantForMood(value) : 'idle'} size={140} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>One tap. No words needed.</Text>

        <View style={styles.moodRow}>
          {MOOD_OPTS.map((o) => {
            const sel = value === o.m;
            return (
              <Pressable key={o.m} onPress={() => setValue(o.m)} style={[styles.moodBtn, sel && styles.moodBtnSel]}>
                <NoitMini state={noitVariantForMood(o.m)} size={42} />
                <Text style={[styles.moodLbl, sel && { color: '#1A8044', fontWeight: '700' }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.btnMain, !value && { opacity: 0.5 }]}
            disabled={!value}
            onPress={onNext}
          >
            <Text style={styles.btnMainText}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/* ═════ CHOICE ═════ */
function ChoiceScreen({
  onBack,
  onContinue,
  starting,
}: {
  onBack: () => void;
  onContinue: (mode: CravingMode) => void;
  starting?: boolean;
}) {
  const [selected, setSelected] = useState<CravingMode | null>(null);
  return (
    <View style={styles.screen}>
      <PurpleBg />
      <Pressable style={styles.backBtnTL} onPress={onBack} disabled={starting}>
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Path d="M10 3L5 8l5 5" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: 30 }}>
          <Noit state="happy" size={150} />
        </View>
        <Text style={styles.title}>How do you{'\n'}want to do this?</Text>
        <Text style={styles.sub}>Both work. You choose.</Text>

        <Pressable
          style={[styles.choiceCard, selected === 'feed' && styles.choiceCardSel, starting && { opacity: 0.6 }]}
          onPress={() => setSelected('feed')}
          disabled={starting}
        >
          <View style={styles.choiceIcon}>
            <Text style={{ fontSize: 28 }}>💬</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.choiceCardTitle}>Talk to Stoppy</Text>
            <Text style={styles.choiceCardDesc}>10 min conversation + reflection</Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.choiceCard, selected === 'breathe' && styles.choiceCardSel, starting && { opacity: 0.6 }]}
          onPress={() => setSelected('breathe')}
          disabled={starting}
        >
          <View style={styles.choiceIcon}>
            <Text style={{ fontSize: 28 }}>🌬️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.choiceCardTitle}>Breathe</Text>
            <Text style={styles.choiceCardDesc}>5 min guided breathing</Text>
          </View>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            style={[styles.btnMain, (!selected || starting) && { opacity: 0.5 }]}
            disabled={!selected || starting}
            onPress={() => selected && onContinue(selected)}
          >
            <Text style={styles.btnMainText}>{starting ? 'Starting…' : 'Continue'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/* ═════ CHAT (Talk to Stoppy) ═════ */
function ChatScreen({ onEnd, onBack }: { onEnd: () => void; onBack: () => void }) {
  const {
    session,
    messages,
    stoppyState: noitState,
    setStoppyState,
    isStreaming,
    isCrisis,
    balanceRounds,
    sendMessage,
    incrementBalanceRound,
  } = useActiveSession();
  const [input, setInput] = useState('');
  const [timer, setTimer] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Session timer keeps running regardless of the focus ring mini-game — that
  // lives inline on the Stoppy stage (no Modal / navigation), so this component
  // never unmounts and neither the timer nor an in-flight Gemini reply stops.
  useEffect(() => {
    const i = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    sendMessage(t);
    setInput('');
  };

  const mins = Math.floor(timer / 60);
  const secs = timer % 60;

  // Status pill follows the focus-ring fill: more progress → more dots lit and
  // an encouraging label near the top. 0% = neutral listening.
  const [ringPct, setRingPct] = useState(0);

  const statusLabel =
    noitState === 'thinking'
      ? 'Thinking'
      : isStreaming
      ? 'Replying'
      : ringPct >= 0.75
      ? 'Keep going'
      : ringPct > 0.001
      ? 'Mmm'
      : 'Listening';

  // 3 dots fill up with the ring: <33% = 1, <66% = 2, ≥66% = 3 (0% = none lit).
  const litDots = ringPct <= 0.001 ? 0 : ringPct < 0.34 ? 1 : ringPct < 0.67 ? 2 : 3;
  const dotStyle = (i: number) => ({ opacity: i < litDots ? 1 : 0.3 });

  return (
    <View style={styles.screen}>
      <PurpleBg />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path d="M10 3L5 8l5 5" stroke="rgba(255,255,255,0.75)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <View style={styles.nameRow}>
            <View style={styles.av}>
              <Noit state="idle" size={36} glow={false} showSparkles={false} />
            </View>
            <View>
              <Text style={styles.nameText}>Stoppy</Text>
              <Text style={styles.status}>{statusLabel}</Text>
            </View>
          </View>
          <View style={styles.timer}>
            <Text style={styles.timerText}>
              {mins}:{secs.toString().padStart(2, '0')}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progWrap}>
          <View style={styles.progTrack}>
            <View style={[styles.progFill, { width: `${Math.min((timer / 600) * 100, 100)}%` }]} />
          </View>
        </View>

        {/* Noit stage */}
        <View style={styles.noitStage}>
          <Noit state={noitState} size={128} />
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, dotStyle(0)]} />
            <View style={[styles.statusDot, dotStyle(1)]} />
            <View style={[styles.statusDot, dotStyle(2)]} />
            <Text style={styles.statusPillText}>{statusLabel}</Text>
          </View>

          {/* Focus-ring tap button — tap fast to weave a bamboo ring around the
              button and hold off the intrusive thoughts. Stoppy's face shifts
              with how full the ring is (calm → tense near the top). Inline (no
              modal) so you can drop back to typing any time. */}
          {!isCrisis && (
            <FocusRingButton
              rounds={balanceRounds}
              onComplete={incrementBalanceRound}
              onBand={(state) => setStoppyState(state)}
              onSettle={() => setStoppyState('listening')}
              onProgress={setRingPct}
            />
          )}
        </View>

        {/* Crisis banner */}
        {isCrisis && (
          <View style={styles.crisisBanner}>
            <Text style={styles.crisisText}>{CRISIS_MESSAGE}</Text>
            <Pressable onPress={onEnd} style={styles.crisisBtn}>
              <Text style={styles.crisisBtnText}>End session safely</Text>
            </Pressable>
          </View>
        )}

        {/* Chat */}
        {!isCrisis && (
          <ScrollView
            ref={scrollRef}
            style={styles.chatArea}
            contentContainerStyle={{ paddingBottom: 8 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((m) => (
              <View
                key={m.id}
                style={[styles.bubble, m.role === 'stoppy' ? styles.bn : styles.bu]}
              >
                <Text style={m.role === 'stoppy' ? styles.bnText : styles.buText}>{m.text}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        {!isCrisis && (
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type something…"
              placeholderTextColor="rgba(255,255,255,0.38)"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={send}
              returnKeyType="send"
              editable={!isStreaming}
            />
            <Pressable style={styles.sendBtn} onPress={send} disabled={isStreaming}>
              <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                <Path d="M2 9l14-7-7 14V9H2z" fill="#1A8044" />
              </Svg>
            </Pressable>
          </View>
        )}

        {!isCrisis && (
          <Pressable onPress={onEnd} style={styles.endLink}>
            <Text style={styles.endLinkText}>End session</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

/* ═════ FOCUS RING — hold off the intrusive thoughts ═════
   Inline mini-game on the Stoppy stage (no modal — the chat stays live so the
   timer and any in-flight Gemini reply keep running). Tap the bamboo button
   fast: each tap weaves a bamboo ring further closed AROUND THE BUTTON. Stop
   tapping and the ring unravels (decays) back toward 0 — let it hit 0 and it
   vanishes, you start over. Fill it completely → the ring "snaps shut", the
   completed-rings count bumps, the NEXT ring decays FASTER, and Stoppy goes back
   to calm. As the ring fills, Stoppy's face goes from calm → tense (the pressure
   builds the closer you are to sealing it). */

const RING_FILL_PER_TAP = 0.14; // progress added per tap (≈8 taps from empty — easier)
const RING_BASE_DECAY = 0.22; // progress lost per second at round 0 (gentler)
const RING_DECAY_STEP = 0.08; // extra decay per second for each completed ring
const RING_MAX_DECAY = 1.1; // cap so it never becomes literally impossible
const RING_TICK_MS = 33; // ~30fps decay loop (JS side, drives the shared value)

// Which Stoppy mood to show for a given ring fill. INVERTED: calm at the start,
// tension builds toward the top (the closer you are to sealing the ring, the
// harder Stoppy is straining). Empty = back to neutral listening.
function moodForProgress(p: number): StoppyState {
  if (p <= 0.001) return 'listening'; // idle ring → calm neutral
  if (p < 0.25) return 'happy'; // just started, relaxed
  if (p < 0.5) return 'wink';
  if (p < 0.75) return 'curious';
  if (p < 1) return 'eating'; // near the top → max strain
  return 'eating';
}

const RING_R = 27; // ring radius around the button
const RING_C = 2 * Math.PI * RING_R; // circumference for the dash math

function FocusRingButton({
  rounds,
  onComplete,
  onBand,
  onSettle,
  onProgress,
}: {
  rounds: number;
  onComplete: () => void;
  onBand: (state: StoppyState) => void; // change Stoppy's face when the band changes
  onSettle: () => void; // ring emptied / sealed → back to listening
  onProgress: (pct: number) => void; // report ring fill 0..1 (drives the status pill)
}) {
  // Ring progress 0 → 1. A shared value drives the SVG ring on the UI thread
  // (60fps, no chat re-render); a JS mirror ref feeds the decay loop + mood band.
  const progress = useSharedValue(0);
  const progRef = useRef(0);
  const flash = useSharedValue(0); // snap-shut burst around the button
  const btnPulse = useSharedValue(0); // springy bump per tap

  // Decay rate climbs with each completed ring.
  const decayRate = useRef(RING_BASE_DECAY);
  useEffect(() => {
    decayRate.current = Math.min(
      RING_BASE_DECAY + rounds * RING_DECAY_STEP,
      RING_MAX_DECAY,
    );
  }, [rounds]);

  // Track mood band + status-pill bucket so we only re-render the parent on a
  // real change (not on every ~30fps decay tick).
  const bandRef = useRef<StoppyState>('listening');
  const pillRef = useRef(-1);
  // Buckets line up with the pill thresholds (dots at .34/.67, label at .75).
  const pillBucket = (p: number) =>
    p <= 0.001 ? 0 : p < 0.34 ? 1 : p < 0.67 ? 2 : p < 0.75 ? 3 : 4;
  const setProgress = (p: number) => {
    progRef.current = p;
    progress.value = p;
    const mood = moodForProgress(p);
    if (mood !== bandRef.current) {
      bandRef.current = mood;
      if (p <= 0.001) onSettle();
      else onBand(mood);
    }
    const bucket = pillBucket(p);
    if (bucket !== pillRef.current) {
      pillRef.current = bucket;
      onProgress(p);
    }
  };

  // Continuous decay loop — pulls progress toward 0 when you stop tapping.
  useEffect(() => {
    const id = setInterval(() => {
      if (progRef.current <= 0) return;
      const drop = (decayRate.current * RING_TICK_MS) / 1000;
      setProgress(Math.max(0, progRef.current - drop));
    }, RING_TICK_MS);
    return () => {
      clearInterval(id);
      cancelAnimation(progress);
      cancelAnimation(flash);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    Vibration.vibrate(6); // light feedback per tap; no-op on web
    btnPulse.value = 0;
    btnPulse.value = withSpring(1, { damping: 9, stiffness: 220 }, (done) => {
      if (done) btnPulse.value = withTiming(0, { duration: 160 });
    });

    const next = progRef.current + RING_FILL_PER_TAP;
    if (next >= 1) {
      // Ring snaps shut: burst, count it, reset to empty for the next (faster)
      // ring, and let Stoppy settle back to calm (no star-eyes).
      flash.value = 0;
      flash.value = withSequence(
        withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
      );
      onComplete();
      Vibration.vibrate(18); // satisfying snap
      progRef.current = 0;
      progress.value = withTiming(0, { duration: 220 });
      bandRef.current = 'listening';
      pillRef.current = 0;
      onSettle();
      onProgress(0); // reset the status pill back to "Listening"
    } else {
      setProgress(next);
    }
  };

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_C * (1 - progress.value),
    opacity: progress.value <= 0.001 ? 0 : 0.4 + progress.value * 0.6,
  }));
  const trackProps = useAnimatedProps(() => ({
    opacity: progress.value <= 0.001 ? 0 : 0.18,
  }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value * 0.8,
    transform: [{ scale: 1 + flash.value * 0.5 }],
  }));
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + btnPulse.value * 0.12 }],
  }));

  return (
    <Pressable style={styles.ringBtnWrap} onPress={tap} hitSlop={12}>
      {/* snap-shut halo burst */}
      <Animated.View style={[styles.ringFlash, flashStyle]} pointerEvents="none" />

      {/* the woven ring around the button */}
      <Svg width={64} height={64} viewBox="0 0 64 64" style={StyleSheet.absoluteFill} pointerEvents="none">
        <AnimatedCircle
          cx={32}
          cy={32}
          r={RING_R}
          stroke="#38C97A"
          strokeWidth={2}
          fill="none"
          animatedProps={trackProps}
        />
        <AnimatedCircle
          cx={32}
          cy={32}
          r={RING_R}
          stroke="#5BB87E"
          strokeWidth={3.5}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={RING_C}
          transform="rotate(-90 32 32)"
          animatedProps={ringProps}
        />
      </Svg>

      <Animated.View style={[styles.ringBtn, btnStyle]}>
        <Text style={styles.ringBtnIcon}>🎋</Text>
      </Animated.View>

      {rounds > 0 && (
        <View style={styles.ringBadge}>
          <Text style={styles.ringBadgeText}>{rounds}</Text>
        </View>
      )}
    </Pressable>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/* ═════ BREATHE ═════ */
type BreathePhase = 'inhale' | 'hold' | 'exhale';

const PHASE_DURATIONS: Record<BreathePhase, number> = {
  inhale: 4000,
  hold: 4000,
  exhale: 6000,
};

const PHASE_LABEL: Record<BreathePhase, string> = {
  inhale: 'Breathe in…',
  hold: 'Hold…',
  exhale: 'Breathe out…',
};

const NEXT_PHASE: Record<BreathePhase, BreathePhase> = {
  inhale: 'hold',
  hold: 'exhale',
  exhale: 'inhale',
};

function BreatheScreen({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [count, setCount] = useState(300); // 5 minutes
  const [phase, setPhase] = useState<BreathePhase>('inhale');
  const scale = useSharedValue(1);
  const innerScale = useSharedValue(1);
  const noitBodyScale = useSharedValue(1);
  const breathCloudScale = useSharedValue(0);
  const breathCloudOpacity = useSharedValue(0);
  const breathCloudTy = useSharedValue(0);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bocca aperta durante respiro (inhale + exhale), chiusa durante hold
  const noitVariant = phase === 'hold' ? 'eyes_closed' : 'happy';

  // 5-minute countdown
  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }
    const i = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(i);
  }, [count]);

  // Animate aura + body puff based on current phase
  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(innerScale);
    cancelAnimation(noitBodyScale);
    if (phase === 'inhale') {
      scale.value = withTiming(1.35, {
        duration: PHASE_DURATIONS.inhale,
        easing: Easing.inOut(Easing.ease),
      });
      innerScale.value = withTiming(1.22, {
        duration: PHASE_DURATIONS.inhale,
        easing: Easing.inOut(Easing.ease),
      });
      noitBodyScale.value = withTiming(1.1, {
        duration: PHASE_DURATIONS.inhale,
        easing: Easing.inOut(Easing.ease),
      });
      // breath cloud: drifts in toward mouth from far above (inhalation)
      // Starts far above (-110), ends near mouth (-40) — well outside aura
      breathCloudScale.value = 0.3;
      breathCloudTy.value = -110;
      breathCloudOpacity.value = 0;
      breathCloudScale.value = withTiming(0.55, { duration: PHASE_DURATIONS.inhale, easing: Easing.in(Easing.ease) });
      breathCloudTy.value = withTiming(-40, { duration: PHASE_DURATIONS.inhale, easing: Easing.in(Easing.ease) });
      breathCloudOpacity.value = withSequence(
        withTiming(0.22, { duration: PHASE_DURATIONS.inhale * 0.35, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: PHASE_DURATIONS.inhale * 0.65, easing: Easing.in(Easing.ease) }),
      );
    } else if (phase === 'exhale') {
      scale.value = withTiming(1, {
        duration: PHASE_DURATIONS.exhale,
        easing: Easing.inOut(Easing.ease),
      });
      innerScale.value = withTiming(1, {
        duration: PHASE_DURATIONS.exhale,
        easing: Easing.inOut(Easing.ease),
      });
      noitBodyScale.value = withTiming(0.95, {
        duration: PHASE_DURATIONS.exhale,
        easing: Easing.inOut(Easing.ease),
      });
      // breath cloud: puffs OUT from mouth, drifts up + expands (exhalation)
      // Goes UP and slightly out, exits outside the aura
      breathCloudScale.value = 0.35;
      breathCloudTy.value = -40;
      breathCloudOpacity.value = 0;
      breathCloudScale.value = withTiming(1.1, { duration: PHASE_DURATIONS.exhale, easing: Easing.out(Easing.cubic) });
      breathCloudTy.value = withTiming(-130, { duration: PHASE_DURATIONS.exhale, easing: Easing.out(Easing.cubic) });
      breathCloudOpacity.value = withSequence(
        withTiming(0.3, { duration: PHASE_DURATIONS.exhale * 0.25, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: PHASE_DURATIONS.exhale * 0.75, easing: Easing.in(Easing.ease) }),
      );
    } else {
      // hold: subtle pulse + cloud invisible
      innerScale.value = withRepeat(
        withSequence(
          withTiming(1.24, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.20, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      breathCloudOpacity.value = withTiming(0, { duration: 400 });
    }

    phaseTimerRef.current = setTimeout(() => {
      setPhase((p) => NEXT_PHASE[p]);
    }, PHASE_DURATIONS[phase]);

    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, [phase]);

  const outerAuraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.18,
  }));

  const innerAuraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));

  const noitBodyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: noitBodyScale.value }],
  }));

  const breathCloudStyle = useAnimatedStyle(() => ({
    opacity: breathCloudOpacity.value,
    transform: [
      { translateY: breathCloudTy.value },
      { scale: breathCloudScale.value },
    ],
  }));

  const mins = Math.floor(count / 60);
  const secs = count % 60;

  const PHASES: BreathePhase[] = ['inhale', 'hold', 'exhale'];

  return (
    <View style={styles.screen}>
      <PurpleBg />
      <Pressable style={styles.backBtnTL} onPress={onBack}>
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Path d="M10 3L5 8l5 5" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>

      <View style={styles.breathePage}>
        <View style={styles.breatheHeader}>
          <Text style={styles.breatheLabel}>Breathe with me</Text>
          <Text style={styles.breatheTimer}>
            {mins}:{secs.toString().padStart(2, '0')}
          </Text>
        </View>

        <View style={styles.breatheNoitWrap}>
          <Animated.View style={[styles.breatheAuraOuter, outerAuraStyle]} pointerEvents="none" />
          <Animated.View style={[styles.breatheAuraInner, innerAuraStyle]} pointerEvents="none" />
          <Animated.View style={noitBodyStyle}>
            <Noit state={noitVariant} size={150} showSparkles={false} />
          </Animated.View>
          {/* Breath cloud (sospiro): in on inhale, out on exhale */}
          <Animated.View style={[styles.breathCloud, breathCloudStyle]} pointerEvents="none" />
        </View>

        <Text style={styles.breathePhase}>{PHASE_LABEL[phase]}</Text>

        <View style={styles.phaseDots}>
          {PHASES.map((p) => (
            <View
              key={p}
              style={[
                styles.phaseDot,
                phase === p && styles.phaseDotActive,
              ]}
            />
          ))}
        </View>

        <View style={{ height: 18 }} />

        <Pressable onPress={onComplete} style={styles.breatheSkip} hitSlop={10}>
          <Text style={styles.breatheSkipText}>Finish</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ═════ REFLECT (Breathe) ═════ */
function ReflectScreen({
  moodBefore,
  moodAfter,
  reflection,
  setReflection,
  onBack,
  onNext,
}: {
  moodBefore: Mood | null;
  moodAfter: Mood;
  reflection: string;
  setReflection: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.screen}>
      <PurpleBg />
      <Pressable style={styles.backBtnTL} onPress={onBack}>
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Path d="M10 3L5 8l5 5" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ marginTop: 30 }}>
            <Noit state="curious" size={130} />
          </View>
          <Text style={styles.title}>What just{'\n'}happened?</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, marginBottom: 4 }}>
            <Text style={[styles.sub, { marginTop: 0 }]}>You came in feeling</Text>
            {moodBefore ? <NoitMini state={noitVariantForMood(moodBefore)} size={28} /> : <Text style={styles.sub}>—</Text>}
            <Text style={[styles.sub, { marginTop: 0 }]}>· now</Text>
            <NoitMini state={noitVariantForMood(moodAfter)} size={32} />
          </View>
          <Text style={styles.sub}>What shifted? (Or didn't.)</Text>

          <TextInput
            style={styles.reflectInput}
            placeholder="Type whatever comes up… one word or a paragraph."
            placeholderTextColor="rgba(15,34,24,0.3)"
            value={reflection}
            onChangeText={setReflection}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.actions}>
            <Pressable style={styles.btnMain} onPress={onNext}>
              <Text style={styles.btnMainText}>Save reflection</Text>
            </Pressable>
            <Pressable style={{ alignItems: 'center', paddingVertical: 12, marginTop: 6 }} onPress={onNext}>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' }}>Skip</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ═════ END ═════ */
function EndScreen({
  moodAfter,
  mode,
  reflection,
  onClose,
}: {
  moodAfter: Mood;
  mode: CravingMode;
  reflection: string;
  onClose: () => void;
}) {
  const { endSession, endBreatheSession } = useSessionStore.getState();
  const { session } = useActiveSession();
  const [saving, setSaving] = useState(true);
  const [recap, setRecap] = useState('');

  useEffect(() => {
    const run = mode === 'breathe' ? endBreatheSession(moodAfter, reflection) : endSession(moodAfter);
    run
      .then(() => {
        const st = useSessionStore.getState();
        setRecap(st.activeSession?.recap_text ?? 'Session saved.');
      })
      .catch((e: any) => {
        Alert.alert('Save error', e?.message ?? String(e));
        setRecap('Session ended (save failed).');
      })
      .finally(() => setSaving(false));
  }, []);

  const duration = session ? Math.max(Math.round(((Date.now() - new Date(session.created_at).getTime()) / 1000) / 60), 1) : 0;

  return (
    <View style={styles.screen}>
      <PurpleBg />
      <View style={styles.endStage}>
        <Noit state="eating" size={180} />
        <Text style={styles.endLabel}>Session complete</Text>
        <Text style={styles.endDur}>
          {duration} {duration === 1 ? 'minute' : 'minutes'} ✦
        </Text>
      </View>
      <View style={styles.endCard}>
        <View style={[styles.endChip, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <NoitMini state={noitVariantForMood(moodAfter)} size={24} />
          <Text style={styles.endChipText}>
            {moodAfter >= 4 ? 'Calmer than before' : moodAfter >= 3 ? 'Steady' : 'You showed up'}
          </Text>
        </View>
        <Text style={styles.endTitle}>You showed up today.</Text>
        <Text style={styles.endInsight}>
          {saving ? 'Stoppy is writing your recap…' : `"${recap}"`}
        </Text>
        <Pressable style={[styles.endBtn, saving && { opacity: 0.5 }]} disabled={saving} onPress={onClose}>
          <Text style={styles.endBtnText}>{saving ? 'Saving…' : 'Save to journal'}</Text>
        </Pressable>
        <Pressable style={styles.endGhost} onPress={onClose}>
          <Text style={styles.endGhostText}>Back to home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1F6B4D', overflow: 'hidden' },

  backBtnTL: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Generic page */
  page: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 26, paddingTop: 60, paddingBottom: 36 },
  title: { fontSize: 28, fontWeight: '700', color: 'white', textAlign: 'center', marginTop: 18, lineHeight: 34 },
  sub: { fontSize: 14.5, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 8, maxWidth: 280 },
  actions: { width: '100%', marginTop: 'auto', paddingTop: 24 },
  btnMain: {
    width: '100%',
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 22,
    alignItems: 'center',
  },
  btnMainText: { color: '#1A8044', fontSize: 17, fontWeight: '700' },

  /* Reflect */
  reflectInput: {
    width: '100%',
    minHeight: 140,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 18,
    fontSize: 15,
    lineHeight: 22,
    color: '#0F2218',
    marginTop: 22,
  },

  /* Food picker */
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 22,
    fontSize: 16,
    color: '#0F2218',
    textAlign: 'center',
    marginTop: 22,
  },
  previewWrap: {
    marginTop: 16,
    alignItems: 'center',
    gap: 6,
  },
  previewImg: { width: 90, height: 90 },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'capitalize',
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginTop: 22,
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
    justifyContent: 'center',
  },
  foodCell: {
    alignItems: 'center',
    gap: 6,
    width: 76,
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  foodCellSel: {
    borderColor: '#38C97A',
    borderWidth: 2,
    backgroundColor: 'white',
  },
  foodLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(15,34,24,0.62)',
    textAlign: 'center',
  },
  foodLabelSel: {
    color: '#0F2218',
    fontWeight: '700',
  },

  /* Trigger picker — compact chips, 2 per row, full-width Other */
  triggerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
    justifyContent: 'space-between',
  },
  triggerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    width: '48.5%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  triggerCellOther: {
    width: '100%',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  triggerInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F2218',
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  triggerCellSel: {
    borderColor: '#38C97A',
    borderWidth: 2,
    backgroundColor: 'white',
  },
  triggerIcon: {
    fontSize: 20,
  },
  triggerLabel: {
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(15,34,24,0.72)',
  },
  triggerLabelSel: {
    color: '#0F2218',
    fontWeight: '700',
  },

  /* Mood picker */
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 28, gap: 6 },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    gap: 6,
  },
  moodBtnSel: { backgroundColor: 'white', borderColor: '#38C97A', borderWidth: 2 },
  moodLbl: { fontSize: 11, color: 'rgba(15,34,24,0.62)', fontWeight: '600' },

  /* Choice */
  choiceCard: {
    width: '100%',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  choiceCardSel: { backgroundColor: 'white', borderColor: '#38C97A', borderWidth: 2 },
  choiceIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(31,107,77,0.09)', alignItems: 'center', justifyContent: 'center' },
  choiceCardTitle: { fontSize: 16, fontWeight: '700', color: '#0F2218' },
  choiceCardDesc: { fontSize: 13, color: 'rgba(15,34,24,0.55)', marginTop: 3 },

  /* Top bar (chat) */
  topBar: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  av: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nameText: { fontSize: 16, fontWeight: '700', color: 'white' },
  status: { fontSize: 12, color: 'rgba(255,255,255,0.52)' },
  timer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 13,
  },
  timerText: { fontSize: 14, fontWeight: '700', color: 'white' },
  progWrap: { paddingHorizontal: 20 },
  progTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.7)' },
  noitStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 34,
    position: 'relative',
  },
  noitGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.10)',
    top: '50%',
    left: '50%',
    marginLeft: -130,
    marginTop: -130,
  },
  statusPill: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 4,
  },
  /* Focus-ring tap button (the woven ring draws around the button itself) */
  ringBtnWrap: {
    position: 'absolute',
    bottom: 0,
    right: 14,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFlash: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: '#5BB87E',
  },
  ringBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(56,201,122,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56,201,122,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBtnIcon: { fontSize: 21 },
  ringBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#1A8044',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBadgeText: { fontSize: 11, fontWeight: '800', color: '#E8F5EE' },

  /* Chat bubbles */
  chatArea: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: 18,
    marginBottom: 8,
  },
  bn: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderBottomLeftRadius: 5,
    alignSelf: 'flex-start',
  },
  bu: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomRightRadius: 5,
    alignSelf: 'flex-end',
  },
  bnText: { fontSize: 14.5, lineHeight: 22, color: 'white' },
  buText: { fontSize: 14.5, lineHeight: 22, color: '#0F2218' },

  inputWrap: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 18,
    fontSize: 15,
    color: 'white',
  },
  sendBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endLink: { alignItems: 'center', paddingBottom: 18, paddingTop: 4 },
  endLinkText: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '600', letterSpacing: 1 },

  /* Crisis */
  crisisBanner: {
    margin: 18,
    padding: 20,
    backgroundColor: 'rgba(224, 92, 92, 0.18)',
    borderWidth: 1,
    borderColor: '#E05C5C',
    borderRadius: 18,
  },
  crisisText: { color: 'white', fontSize: 14, lineHeight: 21 },
  crisisBtn: { marginTop: 14, backgroundColor: 'white', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  crisisBtnText: { color: '#8A1840', fontSize: 14, fontWeight: '700' },

  /* Breathe */
  breathePage: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingTop: 110,
    paddingBottom: 40,
  },
  breatheHeader: {
    alignItems: 'center',
    gap: 10,
  },
  breatheLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  breatheTimer: {
    fontSize: 44,
    fontWeight: '300',
    color: 'white',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  breatheNoitWrap: {
    marginTop: 24,
    width: 310,
    height: 310,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breatheAuraOuter: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  breathCloud: {
    position: 'absolute',
    width: 70,
    height: 40,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.85)',
    top: '50%',
    left: '50%',
    marginLeft: -35,
    marginTop: -20,
  },
  breatheAuraInner: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  breathePhase: {
    fontSize: 24,
    fontWeight: '500',
    color: 'white',
    marginTop: 18,
    letterSpacing: 0.5,
  },
  phaseDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  phaseDotActive: {
    backgroundColor: 'white',
    width: 22,
  },
  breatheTapHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 14,
    fontWeight: '500',
    letterSpacing: 0.4,
    height: 18,
  },
  breatheSkip: {
    marginTop: 'auto',
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  breatheSkipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  /* End */
  endStage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  endLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 12 },
  endDur: { fontSize: 22, fontWeight: '700', color: 'white', marginTop: 4 },
  endCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    paddingVertical: 24,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  endChip: { backgroundColor: 'rgba(26,107,68,0.1)', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 12 },
  endChipText: { fontSize: 13, fontWeight: '600', color: '#1A6B44' },
  endTitle: { fontSize: 20, fontWeight: '700', color: '#0F2218' },
  endInsight: {
    fontSize: 14,
    color: 'rgba(15,34,24,0.62)',
    lineHeight: 22,
    marginTop: 8,
    fontStyle: 'italic',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(31,107,77,0.3)',
    paddingLeft: 12,
  },
  endBtn: {
    marginTop: 20,
    paddingVertical: 18,
    backgroundColor: '#38C97A',
    borderRadius: 20,
    alignItems: 'center',
  },
  endBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  endGhost: { paddingVertical: 14, alignItems: 'center' },
  endGhostText: { fontSize: 15, fontWeight: '500', color: 'rgba(15,34,24,0.55)' },
});

