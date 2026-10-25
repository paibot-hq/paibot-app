import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spokenText } from '../src/tools/english/spoken.ts';

// The voice English practice's sentences are read in (Workers AI text-to-speech), and where the recordings live. Changing the
// voice changes every problem's hash, so scripts/english-audio.mjs reads them all again.
export const ENGLISH_VOICE = { model: '@cf/deepgram/aura-2-en', speaker: 'thalia' };
export const AUDIO_DIR = fileURLToPath(new URL('../public/english-audio/', import.meta.url));
export const audioPath = id => `${AUDIO_DIR}${id}.mp3`;
export const audioText = problem => spokenText(problem.stem, problem.choices[problem.answerIndex]);
// 12 hex characters of SHA-256 over the voice and the text: the problem's `audio`, and the ?v= of its URL (a new recording is a new URL).
export const audioHash = problem => createHash('sha256').update(JSON.stringify([ENGLISH_VOICE.model, ENGLISH_VOICE.speaker, audioText(problem)])).digest('hex').slice(0, 12);
