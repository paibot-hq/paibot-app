import { useEffect, useRef, useState } from 'react';
import own from './english.module.css';

// Plays the recording of the answered sentence (made with Workers AI's text-to-speech by scripts/english-audio.mjs). The file is
// fetched only when the button is pressed; leaving the question stops it.
export default function ListenButton({ src, label }: { src: string; label: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => { audio.current?.pause(); }, [src]);
  function play() {
    if (!audio.current || audio.current.dataset.src !== src) {
      audio.current?.pause();
      audio.current = new Audio(src);
      audio.current.dataset.src = src;
      audio.current.onplaying = () => setPlaying(true);
      audio.current.onended = audio.current.onpause = audio.current.onerror = () => setPlaying(false);
    }
    audio.current.currentTime = 0;
    audio.current.play().catch(() => setPlaying(false));
  }
  return <button type="button" className={own.speak} onClick={play} aria-label={label} title={label} data-playing={playing || undefined}>
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  </button>;
}
