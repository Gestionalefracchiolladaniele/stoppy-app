import React from 'react';

import { Stoppy, StoppyVariant } from './Stoppy';

export interface StoppyMiniProps {
  state?: StoppyVariant;
  size?: number;
}

/**
 * Compact static Stoppy for lists / chips / inline mood representation.
 * Reuses the real Stoppy SVG but disables Reanimated loops + the aura.
 */
export function StoppyMini({ state = 'idle', size = 28 }: StoppyMiniProps) {
  return <Stoppy state={state} size={size} static glow={false} />;
}

/** Map a mood (1-5) to a visually & emotionally distinct Stoppy variant.
 * Higher = better. Each mood gets a different eye/mouth so picker rows
 * read differently even at small sizes. */
export function stoppyVariantForMood(mood: number | null | undefined): StoppyVariant {
  if (mood == null) return 'idle';
  // Urge cards map via stoppyVariantForIntensity (urge N → mood 6-N):
  //   Barely=urge1→mood5=happy · Mild=urge2→mood4=wink ·
  //   Medium=urge3→mood3=eyes_closed · Strong=urge4→mood2=curious ·
  //   Intense=urge5→mood1=eating
  if (mood >= 5) return 'happy';        // 5 — beaming (Barely)
  if (mood >= 4) return 'wink';         // 4 — playful wink (Mild)
  if (mood === 3) return 'eyes_closed'; // 3 — calm meditative arcs (Medium)
  if (mood === 2) return 'curious';     // 2 — alert, pupils up-left (Strong)
  return 'eating';                      // 1 — most strained (Intense)
}

/** Map an URGE intensity (1-5) to a Stoppy variant. Inverted vs mood:
 * LOW urge = calm/happy panda, HIGH urge = strained/resisting hard.
 * Implemented by flipping the scale into the mood mapper (urge 1 → mood 5). */
export function stoppyVariantForIntensity(intensity: number | null | undefined): StoppyVariant {
  if (intensity == null) return 'idle';
  return stoppyVariantForMood(6 - intensity);
}
