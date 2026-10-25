// The sentence as it is read aloud: the blank filled with the answer, without the "A:" / "B:" of a dialogue.
export const spokenText = (stem: string, answer: string) => stem.replace('___', answer).replace(/(^|\s)[AB]:\s*/g, '$1').replace(/\s+—\s+/g, ' ').trim();
