import type { Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import {
  Canvas,
  Circle,
  Group,
  Line,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  rect,
  RoundedRect,
  rrect,

  vec,
} from '@shopify/react-native-skia';
import * as React from 'react';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Easing,

  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export type StoppyVariant
  = | 'idle'
    | 'listening'
    | 'thinking'
    | 'eating' // semantically "resisting"
    | 'happy'
    | 'excited'
    | 'wink'
    | 'curious'
    | 'eyes_closed';

export type StoppyProps = {
  state?: StoppyVariant;
  size?: number;
  /** When true: freeze all animations, hide aura. Safe for lists / small renders. */
  static?: boolean;
  /** Show the mint aura glow behind Stoppy. */
  glow?: boolean;
  /** @deprecated Noit-era prop — accepted for shim compat, no-op on Stoppy. */
  crown?: boolean;
  /** @deprecated Noit-era prop — accepted for shim compat, no-op on Stoppy. */
  showSparkles?: boolean;
};

// viewBox tuned for the seated meditation pose. Skia has no viewBox: the root
// <Group> maps the SVG space (VB_X VB_Y VB_W VB_H) onto the canvas via a uniform
// scale = size / VB_W, so EVERY interior coordinate stays the SAME number as the
// SVG original — no re-tuning of any cx/cy/path value.
const VB_X = 2;
const VB_Y = 44;
const VB_W = 224;
const VB_H = 380;

// ── helpers ──────────────────────────────────────────────────────────────────
/** Oval from SVG ellipse centre/radii. */
function ovalRect(cx: number, cy: number, rx: number, ry: number) {
  return rect(cx - rx, cy - ry, rx * 2, ry * 2);
}
const DEG = Math.PI / 180;

/**
 * StoppySkia — the panda mascot rendered entirely with @shopify/react-native-skia.
 * Direct 1:1 port of the react-native-svg Stoppy (same coordinates, same paths,
 * same Reanimated shared values / timings). No SVG nodes → no native crash on
 * low-end Android. 9 variants kept for `stoppyVariantForMood` compatibility.
 */
export function StoppySkia({
  state = 'idle',
  size = 200,
  static: isStatic = false,
  glow = true,
}: StoppyProps) {
  const floatY = useSharedValue(0);
  const blink = useSharedValue(1);
  const bamboo = useSharedValue(3.5);

  // ── Per-variant expression flags ───────────────────────────────────────────
  const showSweat = state === 'eating';
  const showCalmSpark = state === 'happy' || state === 'excited';
  const cheekFlush
    = state === 'eating'
      ? 0.5
      : state === 'eyes_closed'
        ? 0.32
        : state === 'happy' || state === 'excited' || state === 'wink'
          ? 0.35
          : 0.18;

  useEffect(() => {
    if (isStatic)
      return;
    floatY.value = withRepeat(
      withSequence(
        withTiming(-13, { duration: 2100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2100, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4620 }),
        withTiming(0.02, { duration: 130 }),
        withTiming(1, { duration: 220 }),
        withTiming(1, { duration: 530 }),
      ),
      -1,
      false,
    );
    bamboo.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
        withTiming(3.5, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderH = size * (VB_H / VB_W);
  const scale = size / VB_W;
  const effectiveGlow = isStatic ? false : glow;

  // Root transform: map viewBox → canvas + apply the float bob.
  // Order matters: translate the viewBox origin out, add the (scaled) float,
  // then scale the whole interior coordinate space.
  const rootTransform = useDerivedValue<Transforms3d>(() => [
    { translateX: -VB_X * scale },
    { translateY: (-VB_Y + floatY.value) * scale },
    { scale },
  ]);

  // Bamboo sway. rotate-around-point → rotateZ + origin, NO manual translate
  // (the doc's transform rule: rotate uses origin, scale uses manual translate).
  const bambooTransform = useDerivedValue<Transforms3d>(() => [
    { rotateZ: bamboo.value * DEG },
  ]);

  // Blink lids collapse vertically around eye centre y=157 (scale-around-point,
  // NO origin — see the doc's blink-bug rule).
  const blinkLTransform = useDerivedValue<Transforms3d>(() => [
    { translateY: 157 },
    { scaleY: blink.value },
    { translateY: -157 },
  ]);
  const blinkRTransform = blinkLTransform;
  const blinkOpacity = useDerivedValue(() => 1 - blink.value);

  return (
    // pointerEvents="none" everywhere: the mascot is never interactive on its
    // own, and several screens render it INSIDE a Pressable (e.g. the home
    // check-in card → /session). A Skia <Canvas> is a native view that would
    // otherwise swallow the tap and break the parent's onPress.
    <View style={[styles.container, { width: size, height: renderH }]} pointerEvents="none">
      {effectiveGlow && (
        <Canvas
          style={{
            position: 'absolute',
            width: size,
            height: renderH,
          }}
          pointerEvents="none"
        >
          {/* Aura centred on Stoppy's torso (renderH*0.41), forest-mint glow. */}
          <Circle cx={size / 2} cy={renderH * 0.41} r={size * 0.62}>
            <RadialGradient
              c={vec(size / 2, renderH * 0.41)}
              r={size * 0.62}
              colors={['rgba(56,201,122,0.18)', 'rgba(31,107,77,0.06)', 'rgba(31,107,77,0)']}
              positions={[0, 0.44, 1]}
            />
          </Circle>
        </Canvas>
      )}

      <Canvas style={{ width: size, height: renderH }} pointerEvents="none">
        <Group transform={rootTransform}>
          {/* Ground glow — sitting mat shadow */}
          <Oval rect={ovalRect(100, 398, 92, 13)} color="rgba(56,201,122,0.16)" />
          <Oval rect={ovalRect(100, 392, 74, 9)} color="rgba(56,201,122,0.10)" />

          {/* ════ BAMBOO (behind body, sways at the ground) ════ */}
          <Group transform={bambooTransform} origin={vec(183, 360)}>
            <RoundedRect rect={rrect(rect(178, 150, 11, 46), 3.2, 3.2)}>
              <LinearGradient
                start={vec(178, 0)}
                end={vec(189, 0)}
                colors={['#8ED84A', '#60AC2E', '#3C7215']}
                positions={[0, 0.38, 1]}
              />
            </RoundedRect>
            <RoundedRect rect={rrect(rect(175, 196, 17, 6.5), 3, 3)}>
              <LinearGradient
                start={vec(0, 196)}
                end={vec(0, 202.5)}
                colors={['#3E8C1A', '#246010']}
              />
            </RoundedRect>
            <RoundedRect rect={rrect(rect(175, 196, 17, 2), 1, 1)} color="rgba(255,255,255,0.22)" />
            <Line p1={vec(178, 200)} p2={vec(161, 184)} color="#2C6810" style="stroke" strokeWidth={2.4} strokeCap="round" />
            <Group transform={[{ rotateZ: -41 * DEG }]} origin={vec(152, 178)}>
              <Oval rect={ovalRect(152, 178, 16, 5.2)} color="#60AC2E" />
            </Group>

            <RoundedRect rect={rrect(rect(178, 202, 11, 46), 3.2, 3.2)}>
              <LinearGradient
                start={vec(178, 0)}
                end={vec(189, 0)}
                colors={['#72BC36', '#4C9020', '#2C6010']}
                positions={[0, 0.38, 1]}
              />
            </RoundedRect>
            <RoundedRect rect={rrect(rect(175, 248, 17, 6.5), 3, 3)}>
              <LinearGradient
                start={vec(0, 248)}
                end={vec(0, 254.5)}
                colors={['#3E8C1A', '#246010']}
              />
            </RoundedRect>
            <RoundedRect rect={rrect(rect(175, 248, 17, 2), 1, 1)} color="rgba(255,255,255,0.22)" />
            <Line p1={vec(189, 252)} p2={vec(206, 237)} color="#2C6810" style="stroke" strokeWidth={2.4} strokeCap="round" />
            <Group transform={[{ rotateZ: 37 * DEG }]} origin={vec(214, 231)}>
              <Oval rect={ovalRect(214, 231, 16, 5.2)} color="#4C9020" />
            </Group>

            <RoundedRect rect={rrect(rect(178, 254, 11, 46), 3.2, 3.2)}>
              <LinearGradient
                start={vec(178, 0)}
                end={vec(189, 0)}
                colors={['#8ED84A', '#60AC2E', '#3C7215']}
                positions={[0, 0.38, 1]}
              />
            </RoundedRect>
            <RoundedRect rect={rrect(rect(175, 300, 17, 6.5), 3, 3)}>
              <LinearGradient
                start={vec(0, 300)}
                end={vec(0, 306.5)}
                colors={['#3E8C1A', '#246010']}
              />
            </RoundedRect>
            <RoundedRect rect={rrect(rect(175, 300, 17, 2), 1, 1)} color="rgba(255,255,255,0.22)" />
            <RoundedRect rect={rrect(rect(178, 306, 11, 58), 3.2, 3.2)}>
              <LinearGradient
                start={vec(178, 0)}
                end={vec(189, 0)}
                colors={['#72BC36', '#4C9020', '#2C6010']}
                positions={[0, 0.38, 1]}
              />
            </RoundedRect>
            <RoundedRect rect={rrect(rect(181, 150, 3.2, 214), 1.6, 1.6)} color="rgba(255,255,255,0.26)" />
          </Group>

          {/* ════ CROSSED LEGS (lotus) — behind the body ════ */}
          <Group transform={[{ rotateZ: -8 * DEG }]} origin={vec(52, 356)}>
            <Oval rect={ovalRect(52, 356, 34, 27)} color="#0F0F0F" />
          </Group>
          <Group transform={[{ rotateZ: 8 * DEG }]} origin={vec(148, 356)}>
            <Oval rect={ovalRect(148, 356, 34, 27)} color="#0F0F0F" />
          </Group>
          <Oval rect={ovalRect(100, 372, 52, 22)} color="#1A1A1A" />
          <Group transform={[{ rotateZ: 6 * DEG }]} origin={vec(118, 368)}>
            <Oval rect={ovalRect(118, 368, 18, 12)} color="#262626" />
          </Group>
          <Group transform={[{ rotateZ: -6 * DEG }]} origin={vec(82, 368)}>
            <Oval rect={ovalRect(82, 368, 18, 12)} color="#2A2A2A" />
          </Group>
          <Circle cx={118} cy={364} r={3.2} color="rgba(255,170,150,0.16)" />
          <Circle cx={82} cy={364} r={3.2} color="rgba(255,170,150,0.16)" />

          {/* ════ BODY (seated) ════ */}
          <Oval rect={ovalRect(100, 288, 72, 78)}>
            <RadialGradient
              c={vec(100 - 72 + 0.34 * 144, 288 - 78 + 0.28 * 156)}
              r={0.68 * 144}
              colors={['#FFFFFF', '#F7F2EA', '#ECE4D6']}
              positions={[0, 0.6, 1]}
            />
          </Oval>

          {/* ════ ARMS ════ */}
          <Path
            path="M 40 250 C 24 262 20 296 34 326 C 42 344 60 350 72 342 C 78 336 76 326 70 318 C 58 300 54 276 60 258 C 58 248 48 244 40 250 Z"
            color="#0F0F0F"
          />
          <Path
            path="M 160 250 C 176 262 180 296 166 326 C 158 344 140 350 128 342 C 122 336 124 326 130 318 C 142 300 146 276 140 258 C 142 248 152 244 160 250 Z"
            color="#0F0F0F"
          />

          {/* ════ BELLY ════ */}
          <Oval rect={ovalRect(100, 300, 42, 52)}>
            <RadialGradient
              c={vec(100 - 42 + 0.48 * 84, 300 - 52 + 0.36 * 104)}
              r={0.6 * 84}
              colors={['#FFFFFF', '#EDE6DA']}
            />
          </Oval>

          {/* ════ PAWS on knees ════ */}
          <Group transform={[{ rotateZ: -6 * DEG }]} origin={vec(66, 342)}>
            <Oval rect={ovalRect(66, 342, 17, 12)} color="#0F0F0F" />
          </Group>
          <Group transform={[{ rotateZ: 6 * DEG }]} origin={vec(134, 342)}>
            <Oval rect={ovalRect(134, 342, 17, 12)} color="#0F0F0F" />
          </Group>

          {/* ════ EARS ════ */}
          <Circle cx={44} cy={92} r={27} color="#0F0F0F" />
          <Circle cx={156} cy={92} r={27} color="#0F0F0F" />
          <Circle cx={44} cy={92} r={17} color="#1A1A1A" />
          <Circle cx={156} cy={92} r={17} color="#1A1A1A" />
          <Oval rect={ovalRect(40, 86, 6, 8)} color="rgba(255,255,255,0.05)" />
          <Oval rect={ovalRect(152, 86, 6, 8)} color="rgba(255,255,255,0.05)" />

          {/* ════ HEAD ════ */}
          <Oval rect={ovalRect(100, 152, 76, 76)}>
            <RadialGradient
              c={vec(100 - 76 + 0.34 * 152, 152 - 76 + 0.28 * 152)}
              r={0.68 * 152}
              colors={['#FFFFFF', '#F7F2EA', '#ECE4D6']}
              positions={[0, 0.6, 1]}
            />
          </Oval>

          {/* ════ EYEBROWS ════ */}
          <Eyebrows state={state} />

          {/* ════ EYE PATCHES ════ */}
          <Group transform={[{ rotateZ: -12 * DEG }]} origin={vec(75, 158)}>
            <Oval rect={ovalRect(75, 158, 29, 22)} color="#0F0F0F" />
          </Group>
          <Group transform={[{ rotateZ: 12 * DEG }]} origin={vec(125, 158)}>
            <Oval rect={ovalRect(125, 158, 29, 22)} color="#0F0F0F" />
          </Group>

          {/* ════ EYES ════ */}
          <Eyes
            state={state}
            isStatic={isStatic}
            blinkLTransform={blinkLTransform}
            blinkRTransform={blinkRTransform}
            blinkOpacity={blinkOpacity}
          />

          {/* ════ CHEEK BLUSH ════ */}
          <Oval rect={ovalRect(55, 183, 17, 10)} color={`rgba(255,148,128,${cheekFlush})`} />
          <Oval rect={ovalRect(145, 183, 17, 10)} color={`rgba(255,148,128,${cheekFlush})`} />

          {/* ════ NOSE ════ */}
          <Oval rect={ovalRect(100, 191, 9, 6.5)} color="#0F0F0F" />
          <Oval rect={ovalRect(98, 188, 3.5, 2.4)} color="rgba(255,255,255,0.3)" />

          {/* ════ MOUTH ════ */}
          <Mouth state={state} />

          {/* ════ STATE MARKERS ════ */}
          {showSweat && (
            <Path
              path="M 155 128 Q 150 140 155 146 Q 160 140 155 128 Z"
              color="#7FD7FF"
            />
          )}
          {showCalmSpark && (
            <>
              <Path
                path="M 168 148 L 170 155 L 177 157 L 170 159 L 168 166 L 166 159 L 159 157 L 166 155 Z"
                color="#9DF0C0"
              />
              <Circle cx={157} cy={141} r={2} color="#9DF0C0" />
            </>
          )}
        </Group>
      </Canvas>
    </View>
  );
}

// ── Eyebrows (per-state) ───────────────────────────────────────────────────────
function Eyebrows({ state }: { state: StoppyVariant }) {
  const stroke = (path: string, w: number) => (
    <Path path={path} color="#0F0F0F" style="stroke" strokeWidth={w} strokeCap="round" />
  );
  if (state === 'happy' || state === 'excited') {
    return (
      <>
        {stroke('M 58 118 Q 75 112 92 117', 4.5)}
        {stroke('M 108 117 Q 125 112 142 118', 4.5)}
      </>
    );
  }
  if (state === 'wink') {
    return (
      <>
        {stroke('M 58 120 Q 75 112 92 118', 4.5)}
        {stroke('M 108 124 Q 125 122 142 124', 4.5)}
      </>
    );
  }
  if (state === 'curious') {
    return (
      <>
        {stroke('M 58 120 Q 75 113 92 120', 4.5)}
        {stroke('M 108 126 Q 125 124 142 126', 4.5)}
      </>
    );
  }
  if (state === 'eating') {
    return (
      <>
        {stroke('M 58 128 Q 75 136 92 130', 5.5)}
        {stroke('M 108 130 Q 125 136 142 128', 5.5)}
      </>
    );
  }
  if (state === 'eyes_closed') {
    return (
      <>
        {stroke('M 60 126 Q 75 122 91 127', 4.2)}
        {stroke('M 109 127 Q 125 122 140 126', 4.2)}
      </>
    );
  }
  if (state === 'thinking') {
    return (
      <>
        {stroke('M 60 126 Q 75 124 91 129', 4.2)}
        {stroke('M 109 129 Q 125 124 140 126', 4.2)}
      </>
    );
  }
  // idle / listening
  return (
    <>
      {stroke('M 60 126 Q 75 123 91 126', 4.2)}
      {stroke('M 109 126 Q 125 123 140 126', 4.2)}
    </>
  );
}

// ── Eyes (per-state) ────────────────────────────────────────────────────────────
function Eyes({
  state,
  isStatic,
  blinkLTransform,
  blinkRTransform,
  blinkOpacity,
}: {
  state: StoppyVariant;
  isStatic: boolean;
  blinkLTransform: SharedValue<Transforms3d>;
  blinkRTransform: SharedValue<Transforms3d>;
  blinkOpacity: SharedValue<number>;
}) {
  const arc = (path: string, w = 5) => (
    <Path path={path} color="#FFFFFF" style="stroke" strokeWidth={w} strokeCap="round" />
  );

  if (state === 'happy') {
    return (
      <>
        {arc('M 60 162 Q 75 144 90 162')}
        {arc('M 110 162 Q 125 144 140 162')}
      </>
    );
  }
  if (state === 'excited') {
    return (
      <>
        <Path
          path="M75 144 L79 155 L90 156 L81 163 L84 174 L75 167 L66 174 L69 163 L60 156 L71 155 Z"
          color="#F5E060"
        />
        <Path
          path="M125 144 L129 155 L140 156 L131 163 L134 174 L125 167 L116 174 L119 163 L110 156 L121 155 Z"
          color="#F5E060"
        />
      </>
    );
  }
  if (state === 'wink') {
    return (
      <>
        <Circle cx={75} cy={157} r={17} color="#FFFFFF" />
        <Circle cx={75} cy={158} r={11} color="#0F0F0F" />
        <Circle cx={75} cy={158} r={6.5} color="#1C3E24" />
        <Circle cx={70} cy={151} r={3.5} color="rgba(255,255,255,0.96)" />
        {arc('M 110 161 Q 125 149 140 161')}
      </>
    );
  }
  if (state === 'curious') {
    return (
      <>
        <Circle cx={75} cy={157} r={17} color="#FFFFFF" />
        <Circle cx={125} cy={157} r={17} color="#FFFFFF" />
        <Circle cx={72} cy={152} r={12} color="#0F0F0F" />
        <Circle cx={122} cy={152} r={12} color="#0F0F0F" />
        <Circle cx={72} cy={152} r={7} color="#1C3E24" />
        <Circle cx={122} cy={152} r={7} color="#1C3E24" />
        <Circle cx={68} cy={147} r={3.5} color="rgba(255,255,255,0.95)" />
        <Circle cx={118} cy={147} r={3.5} color="rgba(255,255,255,0.95)" />
      </>
    );
  }
  if (state === 'eyes_closed') {
    return (
      <>
        {arc('M 62 156 Q 75 168 90 156')}
        {arc('M 110 156 Q 125 168 138 156')}
      </>
    );
  }
  if (state === 'eating') {
    return (
      <>
        {arc('M 62 152 Q 75 164 90 152', 6)}
        {arc('M 110 152 Q 125 164 138 152', 6)}
        <Line p1={vec(68, 144)} p2={vec(72, 148)} color="#FFFFFF" style="stroke" strokeWidth={2.5} strokeCap="round" />
        <Line p1={vec(82, 142)} p2={vec(82, 147)} color="#FFFFFF" style="stroke" strokeWidth={2.5} strokeCap="round" />
        <Line p1={vec(118, 142)} p2={vec(118, 147)} color="#FFFFFF" style="stroke" strokeWidth={2.5} strokeCap="round" />
        <Line p1={vec(132, 144)} p2={vec(128, 148)} color="#FFFFFF" style="stroke" strokeWidth={2.5} strokeCap="round" />
      </>
    );
  }
  if (state === 'thinking') {
    return (
      <>
        <Circle cx={75} cy={157} r={17} color="#FFFFFF" />
        <Circle cx={125} cy={157} r={17} color="#FFFFFF" />
        <Circle cx={77} cy={151} r={12} color="#0F0F0F" />
        <Circle cx={123} cy={151} r={12} color="#0F0F0F" />
        <Circle cx={77} cy={151} r={7} color="#1C3E24" />
        <Circle cx={123} cy={151} r={7} color="#1C3E24" />
        <Circle cx={74} cy={147} r={3.5} color="rgba(255,255,255,0.95)" />
        <Circle cx={120} cy={147} r={3.5} color="rgba(255,255,255,0.95)" />
      </>
    );
  }
  // idle / listening — round eyes + animated blink lids
  return (
    <>
      <Circle cx={75} cy={157} r={17} color="#FFFFFF" />
      <Circle cx={125} cy={157} r={17} color="#FFFFFF" />
      <Circle cx={77} cy={158} r={12} color="#0F0F0F" />
      <Circle cx={123} cy={158} r={12} color="#0F0F0F" />
      <Circle cx={77} cy={158} r={7} color="#1C3E24" />
      <Circle cx={123} cy={158} r={7} color="#1C3E24" />
      <Circle cx={73} cy={153} r={3.5} color="rgba(255,255,255,0.95)" />
      <Circle cx={119} cy={153} r={3.5} color="rgba(255,255,255,0.95)" />
      {!isStatic && (
        <>
          <Group transform={blinkLTransform} opacity={blinkOpacity}>
            <Oval rect={ovalRect(75, 157, 17, 17)} color="#0F0F0F" />
          </Group>
          <Group transform={blinkRTransform} opacity={blinkOpacity}>
            <Oval rect={ovalRect(125, 157, 17, 17)} color="#0F0F0F" />
          </Group>
        </>
      )}
    </>
  );
}

// ── Mouth (per-state) ───────────────────────────────────────────────────────────
function Mouth({ state }: { state: StoppyVariant }) {
  if (state === 'happy') {
    return (
      <>
        <Path path="M 80 205 Q 100 228 120 205" color="#0F0F0F" style="stroke" strokeWidth={4} strokeCap="round" />
        <Oval rect={ovalRect(100, 214, 13, 8)} color="#0F0F0F" />
        <Oval rect={ovalRect(100, 216, 9, 5.5)} color="#3A1414" />
      </>
    );
  }
  if (state === 'excited') {
    return (
      <>
        <Circle cx={100} cy={212} r={10} color="#0F0F0F" />
        <Circle cx={100} cy={212} r={7} color="#3A1414" />
      </>
    );
  }
  if (state === 'wink') {
    return (
      <Path path="M 86 208 Q 100 220 116 210" color="#0F0F0F" style="stroke" strokeWidth={4} strokeCap="round" />
    );
  }
  if (state === 'curious') {
    return (
      <>
        <Circle cx={100} cy={212} r={7} color="#0F0F0F" />
        <Circle cx={100} cy={212} r={4.5} color="#3A1414" />
      </>
    );
  }
  if (state === 'eyes_closed') {
    return (
      <Path path="M 88 210 Q 100 214 112 210" color="#0F0F0F" style="stroke" strokeWidth={3.5} strokeCap="round" />
    );
  }
  if (state === 'eating') {
    return (
      <>
        <RoundedRect rect={rrect(rect(84, 208, 32, 9), 4, 4)} color="#0F0F0F" />
        <RoundedRect rect={rrect(rect(87, 210, 26, 5), 2, 2)} color="#E8E0D0" />
        <Line p1={vec(93, 210)} p2={vec(93, 215)} color="#0F0F0F" style="stroke" strokeWidth={1.5} />
        <Line p1={vec(100, 210)} p2={vec(100, 215)} color="#0F0F0F" style="stroke" strokeWidth={1.5} />
        <Line p1={vec(107, 210)} p2={vec(107, 215)} color="#0F0F0F" style="stroke" strokeWidth={1.5} />
      </>
    );
  }
  if (state === 'thinking') {
    return (
      <Path path="M 88 210 Q 102 218 114 210" color="#0F0F0F" style="stroke" strokeWidth={3.8} strokeCap="round" />
    );
  }
  // idle / listening — gentle smile with dimples
  return (
    <>
      <Path path="M 84 207 Q 100 224 116 207" color="#0F0F0F" style="stroke" strokeWidth={3.8} strokeCap="round" />
      <Circle cx={84} cy={207} r={2.5} color="rgba(0,0,0,0.2)" />
      <Circle cx={116} cy={207} r={2.5} color="rgba(0,0,0,0.2)" />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
