// Stoppy — thin wrapper over the Skia implementation.
//
// The panda mascot used to be ~150 react-native-svg nodes + animated Reanimated
// shared values. On low-end Android (Xiaomi) that combination crashes the app
// NATIVELY (no JS ErrorBoundary catches it). The fix is to render the mascot
// entirely with @shopify/react-native-skia. See `stoppy-skia.tsx` for the port.
//
// This file stays as the public entry point so the ~13 consumer screens and
// `StoppyMini` keep importing `Stoppy` / `StoppyVariant` unchanged.
// The original SVG version is preserved in `Stoppy.svg.bak.txt` until the Skia
// build is confirmed on a real device.
//
// TODO(web): Skia on web needs CanvasKit (WASM) loaded before first render
// (e.g. a `LoadSkiaWeb()` gate in `_layout.tsx`, guarded by Platform.OS==='web').
// Until then the panda may render empty on the web login/onboarding screens.
// Deferred on purpose — the crash this fixes was Android-native only.
export { StoppySkia as Stoppy } from './stoppy-skia';
export type { StoppyProps, StoppyVariant } from './stoppy-skia';
