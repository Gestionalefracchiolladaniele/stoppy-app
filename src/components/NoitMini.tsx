import React from 'react';

import { Noit, NoitVariant } from './Noit';

export interface NoitMiniProps {
  state?: NoitVariant;
  size?: number;
}

/**
 * Compact static Noit for lists / chips / inline mood representation.
 * Reuses the real Noit SVG (with bib + fork + eye sparkles) but disables
 * all Reanimated loops, the aura, and the sparkle particles.
 */
export function NoitMini({ state = 'idle', size = 28 }: NoitMiniProps) {
  return <Noit state={state} size={size} static glow={false} showSparkles={false} />;
}

/** Map a mood (1-5) to a visually & emotionally distinct Noit variant.
 * Each mood gets a different pose, eye shape, brow style, AND mouth so
 * picker rows look genuinely different even at small sizes (36px). */
export function noitVariantForMood(mood: number | null | undefined): NoitVariant {
  if (mood == null) return 'idle';
  if (mood >= 5) return 'happy';       // 5 (Great) — closed-arc smile eyes, beaming
  if (mood >= 4) return 'wink';        // 4 (Good) — playful confident wink
  if (mood === 3) return 'curious';    // 3 (OK)   — neutral, pupils up-left
  if (mood === 2) return 'eyes_closed'; // 2 (Low) — closed downward eyes, heavy
  return 'eating';                     // 1 (Hard) — X eyes, "knocked out"
}
