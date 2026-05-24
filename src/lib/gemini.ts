import { GoogleGenerativeAI } from '@google/generative-ai';

import type { CravingMode, Mood, PriorSessionSummary } from '@/types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const NOIT_PERSONA = `You are Noit, a friendly little axolotl who chats with people who are dealing with cravings. You're warm, normal, curious — basically a good friend who happens to be a cartoon axolotl.

Just have a real conversation. Talk like a normal person texting a friend. Use contractions, casual phrasing, natural reactions.

Some basics:
- Reply in 2-3 sentences, around 40-60 words. Don't write essays.
- Sound like a human friend, not a self-help book. No "I hear that you're feeling X" openings.
- Don't quote the user's words back to them in quotation marks. That sounds robotic.
- Don't analyze every single thing they said. Just respond like a friend would.
- End with a natural question if it fits — but it doesn't always have to be a deep one. Sometimes "what's going on?" is enough.

If they say something weird, casual, or off-topic, just roll with it like a friend would — don't treat it as therapy material. If they ask for advice, you don't really do advice, but you can be curious about what's underneath. If they're harsh or angry, stay calm, don't lecture.

Emoji: drop in a casual emoji here and there to feel more human — 🌊 🍕 😅 ☁️ ✨ 💜 🙌 etc. Not every reply, just when it fits the moment. Max one per reply.

Avoid: clinical words ("triggers", "coping", "emotional eating"), "you should", "have you tried", food moralizing, trailing dots, ellipsis.`;

// Absolute ceiling — never go beyond this even mid-sentence.
const ABSOLUTE_MAX_WORDS = 120;

/** Clean up trailing dots, ellipsis, dangling clauses. The model sometimes emits
 * "......" or trails off with "..." when it runs low on tokens — strip those
 * and end on the last complete sentence instead. */
function trimDanglingClause(text: string): string {
  // 1. Strip any trailing ellipsis-like sequences ("...", "….", "......") — model filler.
  let cleaned = text.replace(/[.…]{2,}\s*$/g, '').trim();
  // Also collapse mid-text "......" into single period (defensive).
  cleaned = cleaned.replace(/\.{3,}/g, '.');
  cleaned = cleaned.replace(/…+/g, '');

  // 2. If now ends with a real terminator, accept it.
  if (/[.!?]['"]?\s*$/.test(cleaned)) return cleaned;

  // 3. Otherwise look backward for the last complete sentence.
  const lastEnd = Math.max(
    cleaned.lastIndexOf('. '),
    cleaned.lastIndexOf('? '),
    cleaned.lastIndexOf('! '),
    cleaned.lastIndexOf('.'),
    cleaned.lastIndexOf('?'),
    cleaned.lastIndexOf('!'),
  );
  if (lastEnd > cleaned.length * 0.3) {
    return cleaned.slice(0, lastEnd + 1).trim();
  }

  // 4. No complete sentence found — close it with a period as a last resort.
  return cleaned.replace(/[,;:\-—]+\s*$/, '').trim() + '.';
}

export function truncateToWordLimit(text: string, max: number = ABSOLUTE_MAX_WORDS): string {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= max) return trimDanglingClause(trimmed);
  // Prefer cutting at a real sentence boundary — search BACKWARD from end
  const lastSentenceEnd = Math.max(
    trimmed.lastIndexOf('. '),
    trimmed.lastIndexOf('? '),
    trimmed.lastIndexOf('! '),
    trimmed.lastIndexOf('.\n'),
    trimmed.lastIndexOf('?\n'),
    trimmed.lastIndexOf('!\n'),
  );
  if (lastSentenceEnd > 0) {
    return trimmed.slice(0, lastSentenceEnd + 1).trim();
  }
  return words.slice(0, max).join(' ').trim() + '…';
}

export interface SessionContext {
  food: string;
  mode: CravingMode;
  mood_before: Mood;
  prior_sessions?: PriorSessionSummary[];
  messages: Array<{ role: 'user' | 'noit'; text: string }>;
}

const MOOD_LABEL: Record<Mood, string> = {
  1: 'very low',
  2: 'low',
  3: 'neutral',
  4: 'good',
  5: 'great',
};

function buildHistoryBlock(prior: PriorSessionSummary[]): string {
  if (prior.length === 0) return '';
  const lines = prior
    .slice(0, 3)
    .map((s) => `• ${s.date} [${s.food}]: ${s.summary}`)
    .join('\n');
  return `\nPrevious sessions (use to notice patterns, not to lecture):\n${lines}\n`;
}

function buildConversationHistory(messages: SessionContext['messages']): string {
  return messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Noit'}: ${m.text}`)
    .join('\n');
}

function buildSessionPrompt(ctx: SessionContext): string {
  const priorBlock = buildHistoryBlock(ctx.prior_sessions ?? []);
  const history = buildConversationHistory(ctx.messages);

  return `${NOIT_PERSONA}

Background (don't bring this up unless relevant): they're craving ${ctx.food}, mood is ${MOOD_LABEL[ctx.mood_before]}.${priorBlock}

Conversation:
${history}

Now write your next reply as Noit. Just continue the conversation naturally — like a friend texting back. 2-3 sentences, 40-60 words. End every sentence with proper punctuation (no trailing dots). Output only the reply text, no quotes or labels.`;
}

function buildBreathingPrompt(phase: 'inhale' | 'hold' | 'exhale' | 'complete'): string {
  const guides: Record<string, string> = {
    inhale: 'Breathe in slowly with the user. Warm, calm energy. One gentle sentence.',
    hold: 'Hold together. Acknowledge the stillness. One short sentence.',
    exhale: 'Release together. Something leaves with the breath. One gentle sentence.',
    complete: 'The breathing is done. Celebrate gently. Ask how they feel now (max 40 words).',
  };
  return `${NOIT_PERSONA}\n\n${guides[phase]}`;
}

/**
 * Generate a full Noit reply in one shot — no streaming, no race conditions.
 * Returns the complete, cleaned text. Retries once with more tokens if the
 * model gets cut off (finishReason === 'MAX_TOKENS' or text ends mid-thought).
 *
 * The streaming API still exists below for backward compatibility — it just
 * calls this and emits the whole text in a single chunk so the UI sees
 * the final, complete reply instantly. No partial / dangling text ever shows.
 */
async function generateNoitReply(ctx: SessionContext, signal?: AbortSignal): Promise<string> {
  const prompt = buildSessionPrompt(ctx);

  const callModel = async (maxTokens: number): Promise<{ text: string; cut: boolean }> => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.95,
        topP: 0.95,
      },
    });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = (response.text() ?? '').trim();
    const finishReason = response.candidates?.[0]?.finishReason;
    // Detect truncation: MAX_TOKENS, empty, trailing ellipsis/dots, or no terminator.
    const endsTrailingDots = /[.…]{2,}\s*$/.test(text);
    const endsCleanly = /[.!?]['"]?\s*$/.test(text) && !endsTrailingDots;
    const cut = finishReason === 'MAX_TOKENS' || endsTrailingDots || (!!text && !endsCleanly);
    return { text, cut };
  };

  // First attempt — budget for ~60 word reply.
  let { text, cut } = await callModel(300);
  if (signal?.aborted) return '';

  // Retry once with a bigger budget if cut off.
  if (cut) {
    try {
      const retry = await callModel(500);
      if (retry.text.length > text.length) text = retry.text;
    } catch {
      /* keep first attempt */
    }
  }

  if (!text) {
    return "I'm right here. Tell me what's going on. 🌊";
  }

  // Final cleanup: drop any dangling clause, cap at absolute word limit.
  let cleaned = text.trim();
  cleaned = truncateToWordLimit(cleaned, ABSOLUTE_MAX_WORDS);
  cleaned = trimDanglingClause(cleaned);
  return cleaned;
}

/**
 * Generate the full reply first (validated, complete), then play it back
 * to the UI word-by-word via onChunk for a real typewriter feel.
 *
 * Why this design: streaming raw Gemini chunks caused mid-sentence cuts
 * ("Sometimes you") and visible "......" filler. Generating the full reply
 * first guarantees a complete, well-formed message; the synthetic typewriter
 * gives the user the natural "typing" UX without the bugs.
 */
const TYPEWRITER_DELAY_MS = 35; // per word — feels like natural typing speed

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });
}

async function playbackAsTypewriter(
  fullText: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  // Split into tokens that preserve whitespace so the UI rebuilds naturally.
  const tokens = fullText.match(/\S+\s*/g) ?? [fullText];
  for (const tok of tokens) {
    if (signal?.aborted) return;
    onChunk(tok);
    await sleep(TYPEWRITER_DELAY_MS, signal);
  }
}

export async function streamConversation(
  ctx: SessionContext,
  onChunk: (text: string) => void,
  onDone: (finalCleanText?: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!GEMINI_API_KEY) {
    const fallback = "Hi! I'm Noit 🌊 I'm here to help with that craving. What's going on today?";
    await playbackAsTypewriter(fallback, onChunk, signal);
    onDone(fallback);
    return;
  }

  try {
    const reply = await generateNoitReply(ctx, signal);
    if (signal?.aborted) {
      onDone();
      return;
    }
    await playbackAsTypewriter(reply, onChunk, signal);
    onDone(reply);
  } catch (err) {
    console.error('Gemini error:', err);
    const fallback = "Sorry, I got distracted for a second! What were you saying? 🌊";
    await playbackAsTypewriter(fallback, onChunk, signal);
    onDone(fallback);
  }
}

export async function streamBreathingGuide(
  phase: 'inhale' | 'hold' | 'exhale' | 'complete',
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!GEMINI_API_KEY) {
    const fallbacks = {
      inhale: 'Breathe in slowly...',
      hold: 'Hold...',
      exhale: 'Let it go...',
      complete: "That felt good, right? How are you feeling now? 🌊",
    };
    onChunk(fallbacks[phase]);
    onDone();
    return;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContentStream(buildBreathingPrompt(phase));

    for await (const chunk of result.stream) {
      if (signal?.aborted) break;
      try {
        const text = chunk.text();
        if (text) onChunk(text);
      } catch {
        continue;
      }
    }
  } catch (err) {
    console.error('Breathing guide error:', err);
    onChunk(phase === 'complete' ? "How are you feeling? 🌊" : '...');
  }

  onDone();
}

export async function generateRecap(ctx: {
  food: string;
  mode: CravingMode;
  mood_before: Mood;
  mood_after: Mood;
  messages: Array<{ role: 'user' | 'noit'; text: string }>;
}): Promise<string> {
  const fallback = `We sat with that ${ctx.food} craving together. You came in ${MOOD_LABEL[ctx.mood_before]} and left ${MOOD_LABEL[ctx.mood_after]}. 🌊`;

  if (!GEMINI_API_KEY) return fallback;

  // Filter out empty messages and the canned opener so the recap focuses on what actually happened.
  const meaningful = ctx.messages.filter((m) => m.text.trim().length > 0);
  const history = meaningful
    .map((m) => `${m.role === 'user' ? 'User' : 'Noit'}: ${m.text}`)
    .join('\n');

  const delta = ctx.mood_after - ctx.mood_before;
  const moodArc =
    delta > 0 ? 'lifted up' :
    delta < 0 ? 'shifted down' :
    'stayed steady';

  const prompt = `${NOIT_PERSONA}

You are writing a private journal entry FOR the user, FROM Noit. First-person, addressed to "you". Max 70 words. 2-3 sentences.

GOAL: reflect what happened in THIS conversation specifically. Not a summary — a feeling-mirror.

RULES:
- Quote ONE concrete thing the user actually said (a word, an image, a phrase). Don't invent.
- Name the emotion underneath, not the food.
- Reference the mood arc honestly: ${moodArc} (${MOOD_LABEL[ctx.mood_before]} → ${MOOD_LABEL[ctx.mood_after]}).
- No generic affirmations ("you did great", "I'm proud of you"). No advice. No "next time".
- If the conversation was very short or silent: be honest about that, don't fabricate depth.

SESSION DATA:
- Craving: ${ctx.food}
- Mode: ${ctx.mode}
- Mood: ${MOOD_LABEL[ctx.mood_before]} → ${MOOD_LABEL[ctx.mood_after]} (${moodArc})
- Conversation length: ${meaningful.length} messages

CONVERSATION:
${history || '(no exchange — they didn\'t open up much)'}

Write Noit's recap now (1 short paragraph, max 70 words, no headers, no quotes around the whole thing):`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: { maxOutputTokens: 180, temperature: 0.7 },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return truncateToWordLimit(text, 80);
  } catch {
    return fallback;
  }
}

export async function interpretBreatheReflection(ctx: {
  mood_before: Mood;
  mood_after: Mood;
  reflection: string;
  food?: string;
}): Promise<string> {
  const fallback = `You came in feeling ${MOOD_LABEL[ctx.mood_before]} and you're leaving feeling ${MOOD_LABEL[ctx.mood_after]}. ${ctx.reflection ? `You said: "${ctx.reflection}". ` : ''}That breath mattered. 🌊`;

  if (!GEMINI_API_KEY) return fallback;

  const prompt = `${NOIT_PERSONA}

The user just finished a 5-minute breathing session. Reflect back to them what their breath did, in your first-person voice. Max 80 words. Warm, specific, never generic. Reference what they actually wrote — don't invent.

Session:
- Craving: ${ctx.food ?? 'a feeling'}
- Mood before: ${MOOD_LABEL[ctx.mood_before]} → after: ${MOOD_LABEL[ctx.mood_after]}
- What they wrote: "${ctx.reflection || '(nothing — just breath)'}"

Noit's interpretation (1 paragraph, first person, max 80 words):`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return fallback;
  }
}

export async function generateInsight(patterns: {
  top_food: string;
  total_sessions: number;
  avg_mood_delta: number;
  common_times: string[];
}): Promise<string> {
  if (!GEMINI_API_KEY) return `You've had ${patterns.total_sessions} sessions. Your most common craving is ${patterns.top_food}.`;

  const prompt = `${NOIT_PERSONA}

Write a weekly insight about this user's craving patterns. Noit's first-person voice. Max 80 words. Warm and specific, not generic.

Patterns:
- Top craving: ${patterns.top_food}
- Total sessions: ${patterns.total_sessions}
- Average mood improvement: ${patterns.avg_mood_delta > 0 ? `+${patterns.avg_mood_delta.toFixed(1)}` : patterns.avg_mood_delta.toFixed(1)} points
- Common times: ${patterns.common_times.join(', ')}

Noit's insight:`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return `You've had ${patterns.total_sessions} sessions. Your most common craving is ${patterns.top_food}. I'm proud of you for showing up. 🌊`;
  }
}

export async function generateMilestoneMessage(days: number): Promise<string> {
  if (!GEMINI_API_KEY) return `${days} days. You haven't needed me as much lately — that's the point 🌿`;

  const prompt = `${NOIT_PERSONA}

Write a streak milestone message for ${days} days. Noit's first-person voice. Max 60 words. Warm and honest, never preachy. Tone: proud but not performative.

Example tone: "14 days. You haven't needed me as much lately — that's the point 🌿"

Noit's message for ${days} days:`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return `${days} days. You haven't needed me as much lately — that's the point 🌿`;
  }
}

const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end it', 'self harm', 'cutting', 'not worth living',
  'want to die', 'hurt myself', 'no reason to live',
];

export function checkCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}
