import { useEffect, useState } from 'react';
import own from './english.module.css';

// Reads an English sentence aloud with the browser's own speech (Web Speech API): no audio files, and the voice is the device's.
// Shown only where the browser can speak; a browser without English voices still reads it with its default one.
export default function SpeakButton({ text, label }: { text: string; label: string }) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    setAvailable(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, []);
  if (!available) return null;
  function speak() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    const voices = synth.getVoices().filter(voice => voice.lang.replace('_', '-').startsWith('en'));
    const voice = voices.find(v => v.lang.replace('_', '-') === 'en-US' && v.localService) ?? voices.find(v => v.lang.replace('_', '-') === 'en-US') ?? voices[0];
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  }
  return <button type="button" className={own.speak} onClick={speak} aria-label={label} title={label}>
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  </button>;
}
