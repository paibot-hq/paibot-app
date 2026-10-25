// One English practice problem as stored in english_problems.payload: a short sentence with a blank and four choices
// (grammar and vocabulary alike); the right choice is the row's answer_index. The explanation, the point it
// practises and the translation are in Japanese to begin with (docs/plans/english-practice.md).
export interface EnglishPayload {
  stem: string;
  choices: [string, string, string, string];
  explanation: { ja: string };
  point: { ja: string };
  // The answered sentence in Japanese, shown with the explanation.
  translation: { ja: string };
  // The recording of the answered sentence (scripts/english-audio.mjs): served at /english-audio/<id>.mp3?v=<audio>.
  audio?: string;
}
