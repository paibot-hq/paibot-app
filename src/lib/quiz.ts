export type QuizLocale = 'ja' | 'en' | 'zh';
export interface QuizTranslation {
  prompt: string;
  choices: string[];
  explanation: string;
}
export interface QuizQuestion extends QuizTranslation {
  id: string;
  answerIndex: number;
  source: string;
}
