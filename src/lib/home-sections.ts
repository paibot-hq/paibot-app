import type { AppSlug } from './app-catalog.ts';

export const HOME_SECTIONS = ['learn', 'lab', 'tools', 'play'] as const;
export type HomeSection = (typeof HOME_SECTIONS)[number];

export function homeSection(value: string | null): HomeSection | null {
  return HOME_SECTIONS.find(section => section === value) ?? null;
}

export const HOME_GROUPS = {
  learn: [
    { id: 'mathematics', apps: ['math'] },
    { id: 'artificialIntelligence', apps: [] },
  ],
  lab: [
    { id: 'mathAndAi', apps: ['gradient-descent', 'grapher', 'approx', 'series', 'fourier', 'polyhedra', 'collector'] },
    { id: 'physicsAndSystems', apps: ['pendulum', 'life', 'strings', 'noise', 'koma'] },
    { id: 'computingExperiments', apps: ['sql', 'linux'] },
    { id: 'codeAndModels', apps: ['code-draw', 'browser-ai', 'kaleidoscope', 'glitch'] },
  ],
  tools: [
    { id: 'photosAndText', apps: ['metadata', 'mosaic', 'wc', 'business-card', 'resignation'] },
    { id: 'developmentAndData', apps: ['code-runner', 'json', 'base64', 'urlencode', 'password', 'llm-memory'] },
    { id: 'network', apps: ['ip', 'domain', 'cidr', 'site-check'] },
    { id: 'calculationsAndTime', apps: ['date-calc', 'tax', 'split', 'unit-converter', 'age', 'arith'] },
    { id: 'daily', apps: ['calendar', 'life-calendar', 'clock', 'stopwatch', 'pomodoro', 'metronome', 'heart-rate'] },
    { id: 'reference', apps: ['govfaq', 'breaches', 'warnings', 'quake', 'stocks'] },
  ],
  play: [
    { id: 'games', apps: ['puchi', 'crane-game', 'fruit-merge', 'pinball', 'number-merge', 'goldfish-escape', 'balls', 'circle', 'reaction', 'timing', 'typing', 'color-trick', 'dice', 'roulette'] },
    { id: 'quizzesAndFortune', apps: ['quiz', 'iq-test', 'personality', 'birthday-fortune', 'omikuji'] },
    { id: 'watchAndRelax', apps: ['goldfish', 'fireworks', 'random-video'] },
  ],
} as const satisfies Record<HomeSection, readonly { id: string; apps: readonly AppSlug[] }[]>;
