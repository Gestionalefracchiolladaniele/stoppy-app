import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Path,
  G,
  Line,
  RadialGradient,
  Stop,
} from 'react-native-svg';

const AG = Animated.createAnimatedComponent(G);

export type NoitVariant =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'eating'
  | 'happy'
  | 'excited'
  | 'wink'
  | 'curious'
  | 'eyes_closed';

export interface NoitProps {
  state?: NoitVariant;
  size?: number;
  crown?: boolean;
  showSparkles?: boolean;
  glow?: boolean;
  /** When true: freeze all animations, hide aura + sparkles. Safe for lists / small renders. */
  static?: boolean;
}

export function Noit({
  state = 'idle',
  size = 200,
  crown = false,
  showSparkles = true,
  glow = true,
  static: isStatic = false,
}: NoitProps) {
  const breathe = useSharedValue(1);
  const blink = useSharedValue(1);
  const finL = useSharedValue(-8);
  const finR = useSharedValue(8);
  const floatY = useSharedValue(0);
  const tilt = useSharedValue(0);
  const antenna = useSharedValue(0);
  const sp1 = useSharedValue(0);
  const sp2 = useSharedValue(0);
  const sp3 = useSharedValue(0);
  const jiggle = useSharedValue(1);

  // State-dependent animations only (re-run on state change)
  useEffect(() => {
    if (isStatic) return; // static mode: skip all animations
    if (state === 'eating') {
      breathe.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 280, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.02, { duration: 280, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      jiggle.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 220, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.97, { duration: 220, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      jiggle.value = withTiming(1, { duration: 200 });
      breathe.value = withRepeat(
        withSequence(
          withTiming(1.034, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }
    if (state === 'listening' || state === 'thinking') {
      tilt.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 700 }),
          withTiming(-6, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(-6, { duration: 1200 }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      tilt.value = withTiming(0, { duration: 300 });
    }
  }, [state]);

  // Persistent loops that DON'T depend on state (run once at mount)
  useEffect(() => {
    if (isStatic) return; // static mode: skip persistent loops
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4176 }),
        withTiming(0.07, { duration: 120 }),
        withTiming(1, { duration: 504 }),
      ),
      -1,
      false,
    );
    finL.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    finR.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    floatY.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    antenna.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    sp1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    sp2.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
    sp3.value = withDelay(
      1500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  // Tutto in un solo gruppo "rootProps" → translate(float) + rotate(tilt) attorno al centro
  const rootProps = useAnimatedProps(() => ({
    transform: `translate(0 ${floatY.value}) rotate(${tilt.value} 100 100)`,
  }));

  const bodyProps = useAnimatedProps(() => ({
    transform: `translate(100 168) scale(${breathe.value * jiggle.value} ${breathe.value / Math.max(jiggle.value, 0.5)}) translate(-100 -168)`,
  }));

  const eyeProps = useAnimatedProps(() => ({
    transform: `translate(100 100) scale(1 ${blink.value}) translate(-100 -100)`,
  }));

  const finLProps = useAnimatedProps(() => ({
    transform: `rotate(${finL.value} 28 118)`,
  }));

  const finRProps = useAnimatedProps(() => ({
    transform: `rotate(${finR.value} 172 118)`,
  }));

  // Rotation pivot is at the head center so the plume-tip stars sway softly around the head.
  const antennaProps = useAnimatedProps(() => ({
    transform: `rotate(${antenna.value * 0.6} 100 30)`,
  }));

  const sp1Props = useAnimatedProps(() => ({
    opacity: sp1.value,
    transform: `translate(14 42) scale(${sp1.value}) rotate(${sp1.value * 180}) translate(-14 -42)`,
  }));
  const sp2Props = useAnimatedProps(() => ({
    opacity: sp2.value,
    transform: `translate(183 34) scale(${sp2.value}) rotate(${sp2.value * 180}) translate(-183 -34)`,
  }));
  const sp3Props = useAnimatedProps(() => ({
    opacity: sp3.value,
    transform: `translate(175 42) scale(${sp3.value}) rotate(${sp3.value * 180}) translate(-175 -42)`,
  }));

  // Aura dimensioni: SVG separato che si estende oltre il viewBox di Noit
  const auraSize = size * 1.5;
  // Static mode: force off the expensive overlays.
  const effectiveGlow = isStatic ? false : glow;
  const effectiveSparkles = isStatic ? false : showSparkles;
  return (
    <View style={[styles.container, { width: size, height: size * 1.15 }]}>
      {effectiveGlow && (
        <Svg
          width={auraSize}
          height={auraSize}
          style={{
            position: 'absolute',
            top: (size * 1.15 - auraSize) / 2 + size * 0.05,
            left: (size - auraSize) / 2,
          }}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id="aura" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.28} />
              <Stop offset="0.3" stopColor="#ffffff" stopOpacity={0.14} />
              <Stop offset="0.6" stopColor="#ffffff" stopOpacity={0.04} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={auraSize / 2} cy={auraSize / 2} r={auraSize / 2} fill="url(#aura)" />
        </Svg>
      )}
      <Svg width={size} height={size * 1.15} viewBox="-20 -22 240 252">
        <AG animatedProps={rootProps}>
          {effectiveSparkles && (
            <>
              {/* Stella grande sinistra */}
              <AG animatedProps={sp1Props}>
                <Path
                  d="M14 42l3.5 11.5 3.5-11.5 11.5-3.5-11.5-3.5L14 24l-3.5 11.5-11.5 3.5z"
                  fill="#F5E060"
                />
              </AG>
              {/* Stella media destra-alta */}
              <AG animatedProps={sp2Props}>
                <Path
                  d="M183 22l2.8 9.5 2.8-9.5 9.5-2.8-9.5-2.8L183 8l-2.8 9.5-9.5 2.8z"
                  fill="rgba(255,255,255,0.85)"
                />
              </AG>
              {/* Stella piccola destra-bassa */}
              <AG animatedProps={sp3Props}>
                <Path
                  d="M170 50l2 6.5 2-6.5 6.5-2-6.5-2L170 40l-2 6.5-6.5 2z"
                  fill="rgba(255,220,255,0.8)"
                />
              </AG>
            </>
          )}

          <Ellipse cx="100" cy="210" rx="50" ry="8" fill="#A484D4" opacity="0.18" />

          <AG animatedProps={bodyProps}>
            {state === 'listening' || state === 'thinking' ? (
              <G>
                <Ellipse cx="22" cy="86" rx="26" ry="15" fill="#A484D4" transform="rotate(-50 22 86)" />
                <Ellipse cx="22" cy="86" rx="18" ry="10" fill="#C8B4F4" transform="rotate(-50 22 86)" />
              </G>
            ) : (
              <AG animatedProps={finLProps}>
                <Ellipse
                  cx={state === 'eating' ? 10 : 28}
                  cy={state === 'eating' ? 130 : 118}
                  rx={state === 'eating' ? 32 : 26}
                  ry={state === 'eating' ? 18 : 15}
                  fill="#A484D4"
                  transform={state === 'eating' ? 'rotate(-35 10 130)' : 'rotate(-25 28 118)'}
                />
                <Ellipse
                  cx={state === 'eating' ? 10 : 28}
                  cy={state === 'eating' ? 130 : 118}
                  rx={state === 'eating' ? 22 : 18}
                  ry={state === 'eating' ? 12 : 10}
                  fill="#C8B4F4"
                  transform={state === 'eating' ? 'rotate(-35 10 130)' : 'rotate(-25 28 118)'}
                />
              </AG>
            )}

            <AG animatedProps={finRProps}>
              <Ellipse
                cx={state === 'eating' ? 190 : 172}
                cy={state === 'eating' ? 130 : 118}
                rx={state === 'eating' ? 32 : 26}
                ry={state === 'eating' ? 18 : 15}
                fill="#A484D4"
                transform={state === 'eating' ? 'rotate(35 190 130)' : 'rotate(25 172 118)'}
              />
              <Ellipse
                cx={state === 'eating' ? 190 : 172}
                cy={state === 'eating' ? 130 : 118}
                rx={state === 'eating' ? 22 : 18}
                ry={state === 'eating' ? 12 : 10}
                fill="#C8B4F4"
                transform={state === 'eating' ? 'rotate(35 190 130)' : 'rotate(25 172 118)'}
              />
            </AG>

            {/* ✦ Real fork — full size, held by the right fin (hand).
                Right fin center: (172, 118). Grip is centered exactly at y 118
                so the hand visually clasps the midpoint of the fork. */}
            <G transform={state === 'eating' ? 'translate(14 12)' : ''}>
              {/* Fork tines — 4 long prongs ABOVE the hand */}
              <Path d="M 179.5 70 L 179.5 94" stroke="#E8E4F4" strokeWidth={4} strokeLinecap="round" />
              <Path d="M 179.5 70 L 179.5 94" stroke="#5C3E9C" strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />
              <Path d="M 185 68 L 185 94" stroke="#E8E4F4" strokeWidth={4} strokeLinecap="round" />
              <Path d="M 185 68 L 185 94" stroke="#5C3E9C" strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />
              <Path d="M 191 68 L 191 94" stroke="#E8E4F4" strokeWidth={4} strokeLinecap="round" />
              <Path d="M 191 68 L 191 94" stroke="#5C3E9C" strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />
              <Path d="M 196.5 70 L 196.5 94" stroke="#E8E4F4" strokeWidth={4} strokeLinecap="round" />
              <Path d="M 196.5 70 L 196.5 94" stroke="#5C3E9C" strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />
              {/* Fork head plate — joins the tines */}
              <Path
                d="M 174 94 Q 188 88 202 94 L 202 102 Q 188 108 174 102 Z"
                fill="#E8E4F4"
                stroke="#5C3E9C"
                strokeWidth={1.4}
              />
              <Path
                d="M 176 92 Q 188 89 200 92"
                stroke="#FFFFFF"
                strokeWidth={1}
                fill="none"
                strokeLinecap="round"
                opacity={0.85}
              />
              {/* Shaft — full length, from head down to star pommel */}
              <Path
                d="M 188 102 L 188 142"
                stroke="#E8E4F4"
                strokeWidth={5}
                strokeLinecap="round"
              />
              <Path
                d="M 188 102 L 188 142"
                stroke="#5C3E9C"
                strokeWidth={1.6}
                strokeLinecap="round"
                opacity={0.85}
              />
              <Path
                d="M 186.5 106 L 186.5 138"
                stroke="#FFFFFF"
                strokeWidth={1.2}
                strokeLinecap="round"
                opacity={0.7}
              />
              {/* Grip wrap — centered exactly at fin y (118) */}
              <Path
                d="M 188 112 L 188 124"
                stroke="#5C3E9C"
                strokeWidth={7}
                strokeLinecap="round"
              />
              <Path d="M 184.5 115 L 191.5 115" stroke="#BCA8EE" strokeWidth={0.8} strokeLinecap="round" opacity={0.85} />
              <Path d="M 184.5 118 L 191.5 118" stroke="#BCA8EE" strokeWidth={0.8} strokeLinecap="round" opacity={0.85} />
              <Path d="M 184.5 121 L 191.5 121" stroke="#BCA8EE" strokeWidth={0.8} strokeLinecap="round" opacity={0.85} />
              {/* Star pommel — bottom decorative end cap */}
              <Path
                d="M188 142 L192.5 150.5 L201 151.5 L192.5 152.5 L188 161 L183.5 152.5 L175 151.5 L183.5 150.5 Z"
                fill="#F5E060"
                stroke="#E8C830"
                strokeWidth={1}
              />
              <Circle cx="188" cy="151.5" r="2" fill="#FFF4A0" opacity={0.95} />
            </G>

            <Ellipse
              cx="100"
              cy={state === 'eating' ? 118 : 112}
              rx={state === 'eating' ? 96 : 78}
              ry={state === 'eating' ? 102 : 88}
              fill="#BCA8EE"
            />
            {/* Axolotl head fins — 3 soft fluffy plumes on TOP of the head (real axolotl
                anatomy). Replaces the side ears. Each plume is a soft teardrop, two-tone
                like the hand fins. Slight outward angle gives a feathered look. */}
            {/* Left plume */}
            <Ellipse
              cx={state === 'eating' ? 76 : 82}
              cy={state === 'eating' ? 22 : 18}
              rx={state === 'eating' ? 11 : 9}
              ry={state === 'eating' ? 18 : 15}
              fill="#A484D4"
              transform={state === 'eating' ? 'rotate(-22 76 22)' : 'rotate(-22 82 18)'}
            />
            <Ellipse
              cx={state === 'eating' ? 76 : 82}
              cy={state === 'eating' ? 24 : 20}
              rx={state === 'eating' ? 7 : 6}
              ry={state === 'eating' ? 13 : 11}
              fill="#C8B4F4"
              transform={state === 'eating' ? 'rotate(-22 76 24)' : 'rotate(-22 82 20)'}
            />
            {/* Center plume — slightly taller */}
            <Ellipse
              cx="100"
              cy={state === 'eating' ? 18 : 14}
              rx={state === 'eating' ? 12 : 10}
              ry={state === 'eating' ? 20 : 17}
              fill="#A484D4"
            />
            <Ellipse
              cx="100"
              cy={state === 'eating' ? 20 : 16}
              rx={state === 'eating' ? 8 : 7}
              ry={state === 'eating' ? 14 : 12}
              fill="#C8B4F4"
            />
            {/* Right plume */}
            <Ellipse
              cx={state === 'eating' ? 124 : 118}
              cy={state === 'eating' ? 22 : 18}
              rx={state === 'eating' ? 11 : 9}
              ry={state === 'eating' ? 18 : 15}
              fill="#A484D4"
              transform={state === 'eating' ? 'rotate(22 124 22)' : 'rotate(22 118 18)'}
            />
            <Ellipse
              cx={state === 'eating' ? 124 : 118}
              cy={state === 'eating' ? 24 : 20}
              rx={state === 'eating' ? 7 : 6}
              ry={state === 'eating' ? 13 : 11}
              fill="#C8B4F4"
              transform={state === 'eating' ? 'rotate(22 124 24)' : 'rotate(22 118 20)'}
            />

            {crown && (
              <G>
                <Path d="M68 50 L77 34 L90 48 L100 28 L110 48 L123 34 L132 50 Z" fill="#F5E060" />
                <Path d="M68 50 h64 v7 a4 4 0 01-4 4 H72 a4 4 0 01-4-4z" fill="#E8C830" />
                <Circle cx="77" cy="34" r="4.5" fill="#FFF4A0" />
                <Circle cx="100" cy="28" r="4.5" fill="#FFF4A0" />
                <Circle cx="123" cy="34" r="4.5" fill="#FFF4A0" />
              </G>
            )}

            {/* Tiny yellow stars on the tips of each axolotl head plume.
                Subtle wobble via antenna shared value for a soft sparkle effect.
                Tips are: left plume ≈ (74, 4), center ≈ (100, -3), right ≈ (126, 4). */}
            <AG animatedProps={antennaProps}>
              {/* Left plume tip star */}
              <Path
                d={state === 'eating'
                  ? 'M68 -2 L70.5 3 L75.5 3.5 L70.5 4 L68 9 L65.5 4 L60.5 3.5 L65.5 3 Z'
                  : 'M74 0 L76.5 5 L81.5 5.5 L76.5 6 L74 11 L71.5 6 L66.5 5.5 L71.5 5 Z'}
                fill="#F5E060"
                stroke="#E8C830"
                strokeWidth={0.7}
              />
              {/* Center plume tip star — slightly larger */}
              <Path
                d={state === 'eating'
                  ? 'M100 -10 L103 -3.5 L109.5 -3 L103 -2.5 L100 4 L97 -2.5 L90.5 -3 L97 -3.5 Z'
                  : 'M100 -7 L103 -0.5 L109.5 0 L103 0.5 L100 7 L97 0.5 L90.5 0 L97 -0.5 Z'}
                fill="#F5E060"
                stroke="#E8C830"
                strokeWidth={0.8}
              />
              {/* Right plume tip star */}
              <Path
                d={state === 'eating'
                  ? 'M132 -2 L134.5 3 L139.5 3.5 L134.5 4 L132 9 L129.5 4 L124.5 3.5 L129.5 3 Z'
                  : 'M126 0 L128.5 5 L133.5 5.5 L128.5 6 L126 11 L123.5 6 L118.5 5.5 L123.5 5 Z'}
                fill="#F5E060"
                stroke="#E8C830"
                strokeWidth={0.7}
              />
            </AG>

            <Ellipse
              cx="100"
              cy={state === 'eating' ? 130 : 122}
              rx={state === 'eating' ? 68 : 50}
              ry={state === 'eating' ? 72 : 58}
              fill="#D8C8FA"
              opacity="0.65"
            />

            {/* ✦ Bib — white interior, purple border, with horizontal straps.
                Visible in ALL states. Geometry scales up when eating (puffed body). */}
            {state === 'eating' ? (
              <G>
                {/* Bib body — larger to match the puffy eating belly */}
                <Path
                  d="M 60 152 Q 56 178 70 196 Q 100 210 130 196 Q 144 178 140 152 Q 100 162 60 152 Z"
                  fill="#FFFFFF"
                  stroke="#7B5BA9"
                  strokeWidth={2.2}
                />
                {/* Horizontal straps */}
                <Path
                  d="M 60 174 Q 28 170 10 156"
                  stroke="#7B5BA9"
                  strokeWidth={2.8}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.75}
                />
                <Path
                  d="M 140 174 Q 172 170 190 156"
                  stroke="#7B5BA9"
                  strokeWidth={2.8}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.75}
                />
                {/* Subtle inner stitching */}
                <Path
                  d="M 70 162 Q 100 170 130 162"
                  stroke="#7B5BA9"
                  strokeWidth={1.1}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.35}
                />
                {/* Yellow star centered on bib */}
                <Path
                  d="M100 178 L104 188 L114 189 L104 190 L100 200 L96 190 L86 189 L96 188 Z"
                  fill="#F5E060"
                  stroke="#E8C830"
                  strokeWidth={0.9}
                />
                <Circle cx="100" cy="189" r="1.8" fill="#FFF4A0" opacity={0.95} />
              </G>
            ) : (
              <G>
                {/* Bib body — idle/listening/etc. */}
                <Path
                  d="M 70 142 Q 68 164 78 178 Q 100 188 122 178 Q 132 164 130 142 Q 100 150 70 142 Z"
                  fill="#FFFFFF"
                  stroke="#7B5BA9"
                  strokeWidth={2}
                />
                <Path
                  d="M 70 160 Q 40 158 24 146"
                  stroke="#7B5BA9"
                  strokeWidth={2.6}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.75}
                />
                <Path
                  d="M 130 160 Q 160 158 176 146"
                  stroke="#7B5BA9"
                  strokeWidth={2.6}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.75}
                />
                <Path
                  d="M 78 150 Q 100 156 122 150"
                  stroke="#7B5BA9"
                  strokeWidth={1}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.35}
                />
                <Path
                  d="M100 162 L103.5 170 L112 171 L103.5 172 L100 180 L96.5 172 L88 171 L96.5 170 Z"
                  fill="#F5E060"
                  stroke="#E8C830"
                  strokeWidth={0.8}
                />
                <Circle cx="100" cy="171" r="1.6" fill="#FFF4A0" opacity={0.95} />
              </G>
            )}

            {state === 'eating' ? (
              <>
                <Ellipse cx="48" cy="120" rx="32" ry="24" fill="#F2B8CC" opacity="0.9" />
                <Ellipse cx="152" cy="120" rx="32" ry="24" fill="#F2B8CC" opacity="0.9" />
              </>
            ) : (
              <>
                <Ellipse cx="64" cy="122" rx="14" ry="9" fill="#F2B8CC" opacity="0.5" />
                <Ellipse cx="136" cy="122" rx="14" ry="9" fill="#F2B8CC" opacity="0.5" />
              </>
            )}

            {/* Eyebrows */}
            {(state === 'happy' || state === 'excited' || state === 'eating') && (
              <>
                <Path
                  d="M 62 77 Q 79 65 94 77"
                  stroke="#1E1240"
                  strokeWidth={3}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.45}
                />
                <Path
                  d="M 106 77 Q 121 65 138 77"
                  stroke="#1E1240"
                  strokeWidth={3}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.45}
                />
              </>
            )}
            {(state === 'curious' || state === 'thinking') && (
              <>
                <Path
                  d="M 66 83 Q 79 73 92 81"
                  stroke="#1E1240"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.45}
                />
                <Path
                  d="M 108 81 Q 121 75 134 83"
                  stroke="#1E1240"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.45}
                />
              </>
            )}
            {state === 'wink' && (
              <>
                <Path
                  d="M 66 83 Q 79 75 92 83"
                  stroke="#1E1240"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.38}
                />
                <Path
                  d="M 108 78 Q 121 70 134 78"
                  stroke="#1E1240"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.5}
                />
              </>
            )}
            {(state === 'idle' || state === 'listening' || state === 'eyes_closed') && (
              <>
                <Path
                  d="M 66 83 Q 79 75 92 83"
                  stroke="#1E1240"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.38}
                />
                <Path
                  d="M 108 83 Q 121 75 134 83"
                  stroke="#1E1240"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.38}
                />
              </>
            )}

            {/* Eyes */}
            <AG animatedProps={eyeProps}>
              {(state === 'idle' || state === 'listening') && (
                <>
                  <Circle cx="79" cy="100" r="13" fill="#1E1240" />
                  {/* Eye highlight reflection */}
                  <Circle cx="74" cy="95" r="2.5" fill="white" opacity={0.95} />
                  <Path
                    d="M83 90.5 L84.5 94.2 L88.5 95 L84.5 95.8 L83 99.5 L81.5 95.8 L77.5 95 L81.5 94.2 Z"
                    fill="white"
                    opacity={0.95}
                  />
                  <Circle
                    cx="121"
                    cy={state === 'listening' ? 102 : 100}
                    r="13"
                    fill="#1E1240"
                  />
                  {/* Eye highlight reflection */}
                  <Circle cx="116" cy={state === 'listening' ? 97 : 95} r="2.5" fill="white" opacity={0.95} />
                  <Path
                    d={
                      state === 'listening'
                        ? 'M125 92.5 L126.5 96.2 L130.5 97 L126.5 97.8 L125 101.5 L123.5 97.8 L119.5 97 L123.5 96.2 Z'
                        : 'M125 90.5 L126.5 94.2 L130.5 95 L126.5 95.8 L125 99.5 L123.5 95.8 L119.5 95 L123.5 94.2 Z'
                    }
                    fill="white"
                    opacity={0.95}
                  />
                </>
              )}

              {(state === 'curious' || state === 'thinking') && (
                <>
                  <Circle cx="79" cy="100" r="13" fill="#1E1240" />
                  <Circle cx="74" cy="95" r="2.5" fill="white" opacity={0.95} />
                  <Path
                    d="M79 89.5 L80.5 93.2 L84.5 94 L80.5 94.8 L79 98.5 L77.5 94.8 L73.5 94 L77.5 93.2 Z"
                    fill="white"
                    opacity={0.95}
                  />
                  <Circle cx="121" cy="100" r="13" fill="#1E1240" />
                  <Circle cx="116" cy="95" r="2.5" fill="white" opacity={0.95} />
                  <Path
                    d="M121 89.5 L122.5 93.2 L126.5 94 L122.5 94.8 L121 98.5 L119.5 94.8 L115.5 94 L119.5 93.2 Z"
                    fill="white"
                    opacity={0.95}
                  />
                </>
              )}

              {state === 'happy' && (
                <>
                  <Path
                    d="M 64 100 Q 79 86 94 100"
                    stroke="#1E1240"
                    strokeWidth={5.5}
                    strokeLinecap="round"
                    fill="none"
                  />
                  <Path
                    d="M 106 100 Q 121 86 136 100"
                    stroke="#1E1240"
                    strokeWidth={5.5}
                    strokeLinecap="round"
                    fill="none"
                  />
                </>
              )}

              {state === 'excited' && (
                <>
                  <Circle cx="79" cy="100" r="15" fill="#1E1240" />
                  <Circle cx="73" cy="94" r="3" fill="white" opacity={0.95} />
                  <Path
                    d="M83 88.5 L84.8 93.2 L90 94 L84.8 94.8 L83 99.5 L81.2 94.8 L76 94 L81.2 93.2 Z"
                    fill="white"
                    opacity={0.95}
                  />
                  <Circle cx="121" cy="100" r="15" fill="#1E1240" />
                  <Circle cx="115" cy="94" r="3" fill="white" opacity={0.95} />
                  <Path
                    d="M125 88.5 L126.8 93.2 L132 94 L126.8 94.8 L125 99.5 L123.2 94.8 L118 94 L123.2 93.2 Z"
                    fill="white"
                    opacity={0.95}
                  />
                </>
              )}

              {state === 'wink' && (
                <>
                  <Circle cx="79" cy="100" r="13" fill="#1E1240" />
                  <Circle cx="74" cy="95" r="2.5" fill="white" opacity={0.95} />
                  <Path
                    d="M83 90.5 L84.5 94.2 L88.5 95 L84.5 95.8 L83 99.5 L81.5 95.8 L77.5 95 L81.5 94.2 Z"
                    fill="white"
                    opacity={0.95}
                  />
                  <Path
                    d="M 108 100 Q 121 92 134 100"
                    stroke="#1E1240"
                    strokeWidth={5.5}
                    strokeLinecap="round"
                    fill="none"
                  />
                </>
              )}

              {state === 'eating' && (
                <>
                  <Line x1={67} y1={86} x2={91} y2={110} stroke="#1E1240" strokeWidth={6} strokeLinecap="round" />
                  <Line x1={91} y1={86} x2={67} y2={110} stroke="#1E1240" strokeWidth={6} strokeLinecap="round" />
                  <Line x1={109} y1={86} x2={133} y2={110} stroke="#1E1240" strokeWidth={6} strokeLinecap="round" />
                  <Line x1={133} y1={86} x2={109} y2={110} stroke="#1E1240" strokeWidth={6} strokeLinecap="round" />
                </>
              )}

              {state === 'eyes_closed' && (
                <>
                  <Path
                    d="M 67 100 Q 79 108 91 100"
                    stroke="#1E1240"
                    strokeWidth={4}
                    strokeLinecap="round"
                    fill="none"
                  />
                  <Path
                    d="M 109 100 Q 121 108 133 100"
                    stroke="#1E1240"
                    strokeWidth={4}
                    strokeLinecap="round"
                    fill="none"
                  />
                </>
              )}
            </AG>

            {/* Mouth */}
            {state === 'eating' ? (
              <>
                <Ellipse cx="100" cy="132" rx="22" ry="17" fill="#1E1240" />
                <Ellipse cx="100" cy="134" rx="18" ry="14" fill="#F5A0B8" />
                <Ellipse cx="100" cy="143" rx="10" ry="7" fill="#E07090" />
              </>
            ) : state === 'happy' || state === 'excited' ? (
              <>
                <Ellipse cx="100" cy="126" rx="14" ry="10" fill="#1E1240" />
                <Ellipse cx="100" cy="128" rx="11" ry="8" fill="#F5A0B8" />
              </>
            ) : state === 'curious' || state === 'thinking' ? (
              <>
                <Ellipse cx="100" cy="127" rx="9" ry="6.5" fill="#1E1240" />
                <Ellipse cx="100" cy="128.5" rx="6.5" ry="5" fill="#F5A0B8" />
              </>
            ) : (
              <>
                <Ellipse cx="100" cy="126" rx="10" ry="7" fill="#1E1240" />
                <Ellipse cx="100" cy="127.5" rx="7" ry="5" fill="#F5A0B8" />
              </>
            )}

            <Ellipse
              cx={state === 'eating' ? 70 : 78}
              cy={state === 'eating' ? 214 : 194}
              rx={state === 'eating' ? 22 : 20}
              ry={state === 'eating' ? 12 : 11}
              fill="#A484D4"
            />
            <Ellipse
              cx={state === 'eating' ? 130 : 122}
              cy={state === 'eating' ? 214 : 194}
              rx={state === 'eating' ? 22 : 20}
              ry={state === 'eating' ? 12 : 11}
              fill="#A484D4"
            />
          </AG>
        </AG>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
