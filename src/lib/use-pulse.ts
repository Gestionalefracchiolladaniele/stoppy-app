import { useEffect } from 'react';
import { makeMutable, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

// Single shared value at module level — created once, drives ALL consumers
const sharedScale = makeMutable(1.0);

let started = false;
function ensureStarted() {
  if (started) return;
  started = true;
  sharedScale.value = withRepeat(
    withSequence(
      withTiming(1.022, { duration: 1600 }),
      withTiming(1.0, { duration: 1600 }),
    ),
    -1,
    false,
  );
}

export function useSyncPulse() {
  useEffect(() => {
    ensureStarted();
  }, []);
  return sharedScale;
}
