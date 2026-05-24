import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Noit } from '@/components/Noit';
import { NoitMini, noitVariantForMood } from '@/components/NoitMini';
import { PurpleBg } from '@/components/PurpleBg';
import { useAuthStore } from '@/lib/auth-store';
import { POPULAR_PRESETS, resolveFood } from '@/lib/food-registry';
import { CRISIS_MESSAGE, useActiveSession, useSessionStore } from '@/lib/session-store';
import type { CravingMode, Mood } from '@/types';

function getFoodImage(food: string) {
  return resolveFood(food).image;
}

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
        food: food.trim() || 'craving',
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

  if (phase === 'food') return <FoodPicker onBack={close} food={food} setFood={setFood} onNext={() => setPhase('mood')} />;
  if (phase === 'mood')
    return (
      <MoodPicker
        title="How do you feel right now?"
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
        title="How do you feel now?"
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
            <Noit state="curious" size={90} glow={false} />
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
    backgroundColor: 'rgba(20,10,50,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 26,
    paddingTop: 8,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 36,
    elevation: 12,
  },
  iconWrap: { marginTop: -10 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2B1A52',
    marginTop: 4,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: 'rgba(43,26,82,0.62)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 6,
  },
  btnKeep: {
    marginTop: 20,
    width: '100%',
    backgroundColor: '#7B5BA9',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#7B5BA9',
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

/* ═════ FOOD PICKER ═════ */
function FoodPicker({
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
  const preview = food.trim() ? resolveFood(food) : null;

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
          <View style={{ marginTop: 20 }}>
            <Noit state="curious" size={120} />
          </View>
          <Text style={styles.title}>What are you{'\n'}craving?</Text>
          <Text style={styles.sub}>Type anything — I'll find it.</Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. pizza, sushi, lasagna…"
            placeholderTextColor="rgba(43,26,82,0.3)"
            value={food}
            onChangeText={setFood}
          />

          {/* live preview of matched food */}
          {preview && (
            <View style={styles.previewWrap}>
              <Image source={preview.image} style={styles.previewImg} resizeMode="contain" />
              <Text style={styles.previewLabel}>{food.trim()}</Text>
            </View>
          )}

          <Text style={styles.presetLabel}>Popular</Text>
          <View style={styles.foodGrid}>
            {POPULAR_PRESETS.map((p) => {
              const sel = food.toLowerCase() === p.query.toLowerCase();
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setFood(p.query)}
                  style={[styles.foodCell, sel && styles.foodCellSel]}
                >
                  <Image
                    source={resolveFood(p.query).image}
                    style={{ width: 48, height: 48 }}
                    resizeMode="contain"
                  />
                  <Text style={[styles.foodLabel, sel && styles.foodLabelSel]}>{p.label}</Text>
                </Pressable>
              );
            })}
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
  { m: 1, label: 'Low' },
  { m: 2, label: 'Meh' },
  { m: 3, label: 'OK' },
  { m: 4, label: 'Good' },
  { m: 5, label: 'Great' },
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
          <Noit state="idle" size={140} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>One tap. No words needed.</Text>

        <View style={styles.moodRow}>
          {MOOD_OPTS.map((o) => {
            const sel = value === o.m;
            return (
              <Pressable key={o.m} onPress={() => setValue(o.m)} style={[styles.moodBtn, sel && styles.moodBtnSel]}>
                <NoitMini state={noitVariantForMood(o.m)} size={42} />
                <Text style={[styles.moodLbl, sel && { color: '#4A2A80', fontWeight: '700' }]}>{o.label}</Text>
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
            <Text style={styles.choiceCardTitle}>Talk to Noit</Text>
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

/* ═════ CHAT (Feed Noit) ═════ */
function ChatScreen({ onEnd, onBack }: { onEnd: () => void; onBack: () => void }) {
  const { session, messages, noitState, isStreaming, isCrisis, sendMessage, setNoitState } =
    useActiveSession();
  const [input, setInput] = useState('');
  const [timer, setTimer] = useState(0);
  const [showFood, setShowFood] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const food = session?.food ?? '';
  const foodSource = food ? getFoodImage(food) : null;

  // Kirby-style eating animation values
  const foodTx = useSharedValue(0);
  const foodTy = useSharedValue(80); // start below Noit
  const foodScale = useSharedValue(1);
  const foodOpacity = useSharedValue(0);
  const foodRotate = useSharedValue(0);
  // Inhale wind ring around Noit's mouth
  const inhaleScale = useSharedValue(0);
  const inhaleOpacity = useSharedValue(0);
  // Secondary wind ring (delayed) for stronger suck effect
  const inhale2Scale = useSharedValue(0);
  const inhale2Opacity = useSharedValue(0);

  useEffect(() => {
    const i = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const playEatingSequence = () => {
    if (!foodSource) return;
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    setShowFood(true);
    setNoitState('curious'); // anticipa: noit guarda incuriosito

    // reset
    foodTx.value = 0;
    foodTy.value = 90;
    foodScale.value = 0.4;
    foodOpacity.value = 0;
    foodRotate.value = 0;
    inhaleScale.value = 0;
    inhaleOpacity.value = 0;
    inhale2Scale.value = 0;
    inhale2Opacity.value = 0;

    // 1) food fade-in + grow + gentle bob (looped softly)
    foodOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    foodScale.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.back(1.4)) });
    foodTy.value = withSequence(
      withTiming(78, { duration: 350, easing: Easing.out(Easing.ease) }),
      withTiming(92, { duration: 550, easing: Easing.inOut(Easing.ease) }),
      withTiming(78, { duration: 550, easing: Easing.inOut(Easing.ease) }),
    );
    foodRotate.value = withSequence(
      withTiming(-6, { duration: 450, easing: Easing.inOut(Easing.ease) }),
      withTiming(6, { duration: 450, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 350, easing: Easing.inOut(Easing.ease) }),
    );

    // 2) Kirby gets excited then opens mouth wide
    timeoutsRef.current.push(setTimeout(() => setNoitState('excited'), 900));
    timeoutsRef.current.push(setTimeout(() => setNoitState('eating'), 1400));

    // 3) INHALE wind effect — ring expands outward, then contracts toward mouth
    //    + food gets sucked in with rotation + shrink + arc trajectory
    timeoutsRef.current.push(setTimeout(() => {
      // ring 1: starts wide, sucked toward mouth
      inhaleScale.value = 1.4;
      inhaleOpacity.value = 0.55;
      inhaleScale.value = withTiming(0.1, { duration: 600, easing: Easing.in(Easing.cubic) });
      inhaleOpacity.value = withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) });

      // ring 2: delayed for repeat suck sensation
      inhale2Scale.value = 1.7;
      inhale2Opacity.value = 0;
      inhale2Opacity.value = withSequence(
        withTiming(0.35, { duration: 150 }),
        withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) }),
      );
      inhale2Scale.value = withTiming(0.1, { duration: 650, easing: Easing.in(Easing.cubic) });

      // food sucked: arc + spin + fast shrink
      foodTx.value = withTiming(0, { duration: 500 });
      foodTy.value = withSequence(
        withTiming(40, { duration: 200, easing: Easing.out(Easing.ease) }),
        withTiming(-8, { duration: 350, easing: Easing.in(Easing.cubic) }),
      );
      foodScale.value = withSequence(
        withTiming(1.15, { duration: 180, easing: Easing.out(Easing.ease) }), // pre-stretch
        withTiming(0.08, { duration: 380, easing: Easing.in(Easing.cubic) }),
      );
      foodRotate.value = withTiming(540, { duration: 550, easing: Easing.in(Easing.cubic) });
      foodOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 350, easing: Easing.in(Easing.cubic) }),
      );
    }, 1500));

    // 4) gulp! food gone, Kirby fully puffed (linger)
    timeoutsRef.current.push(setTimeout(() => {
      setShowFood(false);
    }, 2100));

    // 5) satisfied happy face (puff still visible briefly via 'eating' lingering pas → happy)
    timeoutsRef.current.push(setTimeout(() => setNoitState('happy'), 2900));

    // 6) back to listening
    timeoutsRef.current.push(setTimeout(() => setNoitState('listening'), 3700));
  };

  useEffect(() => {
    playEatingSequence();
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [foodSource]);

  const foodAnimStyle = useAnimatedStyle(() => ({
    opacity: foodOpacity.value,
    transform: [
      { translateX: foodTx.value },
      { translateY: foodTy.value },
      { scale: foodScale.value },
      { rotate: `${foodRotate.value}deg` },
    ],
  }));

  const inhaleRingStyle = useAnimatedStyle(() => ({
    opacity: inhaleOpacity.value,
    transform: [{ scale: inhaleScale.value }],
  }));
  const inhaleRing2Style = useAnimatedStyle(() => ({
    opacity: inhale2Opacity.value,
    transform: [{ scale: inhale2Scale.value }],
  }));

  const send = () => {
    const t = input.trim();
    if (!t) return;
    sendMessage(t);
    setInput('');
  };

  const mins = Math.floor(timer / 60);
  const secs = timer % 60;

  const statusLabel =
    noitState === 'thinking'
      ? 'Thinking…'
      : noitState === 'eating'
      ? 'Mmm…'
      : noitState === 'happy'
      ? 'Yum!'
      : isStreaming
      ? 'Replying…'
      : 'Listening';

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
              <Text style={styles.nameText}>Noit</Text>
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
          {/* Inhale wind rings — visible during suck */}
          <Animated.View style={[styles.inhaleRing, inhaleRingStyle]} pointerEvents="none" />
          <Animated.View style={[styles.inhaleRing, styles.inhaleRingOuter, inhaleRing2Style]} pointerEvents="none" />

          <Noit state={noitState} size={150} />
          {showFood && foodSource && (
            <Animated.View style={[styles.eatingFood, foodAnimStyle]} pointerEvents="none">
              <Image source={foodSource} style={styles.eatingFoodImg} resizeMode="contain" />
            </Animated.View>
          )}
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <View style={[styles.statusDot, { opacity: 0.6 }]} />
            <View style={[styles.statusDot, { opacity: 0.3 }]} />
            <Text style={styles.statusPillText}>{statusLabel}</Text>
          </View>

          {/* Replay eating animation — food icon button */}
          {foodSource && !showFood && (
            <Pressable style={styles.replayBtn} onPress={playEatingSequence} hitSlop={8}>
              <Image source={foodSource} style={{ width: 30, height: 30 }} resizeMode="contain" />
            </Pressable>
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
                style={[styles.bubble, m.role === 'noit' ? styles.bn : styles.bu]}
              >
                <Text style={m.role === 'noit' ? styles.bnText : styles.buText}>{m.text}</Text>
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
                <Path d="M2 9l14-7-7 14V9H2z" fill="#4A2A80" />
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
            <Noit state={noitVariant} size={210} showSparkles={false} />
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
            placeholderTextColor="rgba(43,26,82,0.3)"
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
          {saving ? 'Noit is writing your recap…' : `"${recap}"`}
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
  screen: { flex: 1, backgroundColor: '#6A4AAC', overflow: 'hidden' },

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
  btnMainText: { color: '#4A2A80', fontSize: 17, fontWeight: '700' },

  /* Reflect */
  reflectInput: {
    width: '100%',
    minHeight: 140,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 18,
    fontSize: 15,
    lineHeight: 22,
    color: '#2B1A52',
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
    color: '#2B1A52',
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
    borderColor: '#7B5BA9',
    borderWidth: 2,
    backgroundColor: 'white',
  },
  foodLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(43,26,82,0.62)',
    textAlign: 'center',
  },
  foodLabelSel: {
    color: '#2B1A52',
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
  moodBtnSel: { backgroundColor: 'white', borderColor: '#7B5BA9', borderWidth: 2 },
  moodLbl: { fontSize: 11, color: 'rgba(43,26,82,0.62)', fontWeight: '600' },

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
  choiceCardSel: { backgroundColor: 'white', borderColor: '#7B5BA9', borderWidth: 2 },
  choiceIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(92,62,156,0.09)', alignItems: 'center', justifyContent: 'center' },
  choiceCardTitle: { fontSize: 16, fontWeight: '700', color: '#2B1A52' },
  choiceCardDesc: { fontSize: 13, color: 'rgba(43,26,82,0.55)', marginTop: 3 },

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
    paddingTop: 14,
    paddingBottom: 22,
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
  inhaleRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 180,
    height: 180,
    marginLeft: -90,
    marginTop: -90,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'transparent',
  },
  inhaleRingOuter: {
    width: 220,
    height: 220,
    marginLeft: -110,
    marginTop: -110,
    borderRadius: 110,
    borderColor: 'rgba(255,255,255,0.35)',
    borderWidth: 2,
  },
  eatingFood: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -32,
    marginTop: -32,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  eatingFoodImg: { width: 60, height: 60, backgroundColor: 'transparent' },

  replayBtn: {
    position: 'absolute',
    bottom: 6,
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },

  /* Chat bubbles */
  chatArea: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
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
  buText: { fontSize: 14.5, lineHeight: 22, color: '#2B1A52' },

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
    marginTop: 28,
    width: 340,
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breatheAuraOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
  endTitle: { fontSize: 20, fontWeight: '700', color: '#2B1A52' },
  endInsight: {
    fontSize: 14,
    color: 'rgba(43,26,82,0.62)',
    lineHeight: 22,
    marginTop: 8,
    fontStyle: 'italic',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(92,62,156,0.3)',
    paddingLeft: 12,
  },
  endBtn: {
    marginTop: 20,
    paddingVertical: 18,
    backgroundColor: '#7B5BA9',
    borderRadius: 20,
    alignItems: 'center',
  },
  endBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  endGhost: { paddingVertical: 14, alignItems: 'center' },
  endGhostText: { fontSize: 15, fontWeight: '500', color: 'rgba(43,26,82,0.55)' },
});
