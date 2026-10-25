// One English practice problem as stored in english_problems.payload: a short sentence with a blank and four choices
// (grammar and vocabulary alike); the right choice is the row's answer_index. The explanation and the point it
// practises are in every language of the site, the translation in Japanese and Chinese (docs/plans/english-practice.md).
export interface EnglishPayload {
  stem: string;
  choices: [string, string, string, string];
  explanation: Record<'ja' | 'en' | 'zh', string>;
  point: Record<'ja' | 'en' | 'zh', string>;
  // The answered sentence translated, shown with the explanation; none in English, the sentence's own language.
  translation: Record<'ja' | 'zh', string>;
  // The recording of the answered sentence (scripts/english-audio.mjs): served at /english-audio/<id>.mp3?v=<audio>.
  audio?: string;
}
