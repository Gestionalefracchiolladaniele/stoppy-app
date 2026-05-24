import { Audio, AVPlaybackStatus } from 'expo-av';

let bgSound: Audio.Sound | null = null;
let ttsSound: Audio.Sound | null = null;
let bgEnabled = true;
let ttsEnabled = true;
let lastSpokenText = '';

export async function initAudio() {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });
}

export function setBgEnabled(v: boolean) {
  bgEnabled = v;
  if (!v) stopBackground();
}

export function setTtsEnabled(v: boolean) {
  ttsEnabled = v;
  if (!v) stopTts();
}

export function isBgEnabled() { return bgEnabled; }
export function isTtsEnabled() { return ttsEnabled; }

export async function playBackground() {
  if (!bgEnabled) return;
  try {
    if (bgSound) {
      const status = await bgSound.getStatusAsync();
      if (status.isLoaded && (status as any).isPlaying) return;
      if (status.isLoaded) {
        await bgSound.playAsync();
        return;
      }
    }
    const { sound } = await Audio.Sound.createAsync(
      require('@/assets/audio/background.mp3'),
      { isLooping: true, volume: 0.35, shouldPlay: true },
    );
    bgSound = sound;
  } catch {}
}

export async function stopBackground() {
  if (!bgSound) return;
  try {
    const status = await bgSound.getStatusAsync();
    if (status.isLoaded) await bgSound.stopAsync();
  } catch {}
}

export async function fadeOutBackground(durationMs = 1500) {
  if (!bgSound) return;
  try {
    const steps = 15;
    const interval = durationMs / steps;
    for (let i = steps; i >= 0; i--) {
      await bgSound.setVolumeAsync(0.35 * (i / steps));
      await new Promise((r) => setTimeout(r, interval));
    }
    await bgSound.stopAsync();
    await bgSound.setVolumeAsync(0.35);
  } catch {}
}

export async function pauseBackground() {
  if (!bgSound) return;
  try {
    const status = await bgSound.getStatusAsync();
    if (status.isLoaded && (status as any).isPlaying) await bgSound.pauseAsync();
  } catch {}
}

export async function resumeBackground() {
  if (!bgEnabled || !bgSound) return;
  try {
    const status = await bgSound.getStatusAsync();
    if (status.isLoaded && !(status as any).isPlaying) await bgSound.playAsync();
  } catch {}
}

export async function playTtsAudio(base64Mp3: string) {
  try {
    await stopTts();
    const uri = `data:audio/mpeg;base64,${base64Mp3}`;
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, volume: 1.0 },
    );
    ttsSound = sound;
    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        ttsSound = null;
      }
    });
  } catch {}
}

export async function pauseTts() {
  if (!ttsSound) return;
  try {
    const status = await ttsSound.getStatusAsync();
    if (status.isLoaded && (status as any).isPlaying) {
      await ttsSound.pauseAsync();
    }
  } catch {}
}

export async function resumeTts() {
  if (!ttsSound) return;
  try {
    const status = await ttsSound.getStatusAsync();
    if (status.isLoaded && !(status as any).isPlaying) {
      await ttsSound.playAsync();
    }
  } catch {}
}

export async function stopTts() {
  if (!ttsSound) return;
  try {
    const status = await ttsSound.getStatusAsync();
    if (status.isLoaded) {
      await ttsSound.stopAsync();
      await ttsSound.unloadAsync();
    }
  } catch {}
  ttsSound = null;
}

export function setLastSpokenText(text: string) {
  lastSpokenText = text;
}

export function getLastSpokenText() {
  return lastSpokenText;
}

export async function cleanupAudio() {
  await stopTts();
  await stopBackground();
  if (bgSound) {
    try { await bgSound.unloadAsync(); } catch {}
    bgSound = null;
  }
}
