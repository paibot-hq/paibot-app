// Turns the rows of the Ministry of Internal Affairs and Communications' FAQ file (Govbot) into the data the FAQ page uses.

// Each question and answer in the file has a reading written in katakana stuck on its end (a hint for search and for screen readers). It is
// cut off: a run of katakana at the very end (two or more straight after a full stop, a bracket or a line break, three or more elsewhere),
// unless the same run is already in the text (then it is a real word).
export function stripReading(text) {
  const m = /[ァ-ヶー]{2,}$/.exec(text);
  if (!m) return text;
  const before = text.slice(0, m.index);
  const afterStop = /[。！？）」』】\n>]$/.test(before);
  if (m[0].length < 3 && !afterStop) return text;
  return before.includes(m[0]) ? text : before;
}

export function cleanText(text) {
  return stripReading(String(text ?? '').replace(/\r\n?/g, '\n').replace(/ /g, ' ').trim()).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// The header row is 'ID', 'category', 'question', 'answer' (each with a reading after it). Rows without a question or an answer, and the
// closing 'EOF' row, are dropped; a category that is broken ('#REF!') or empty becomes 'その他'.
export function buildFaq(rows, source) {
  const [header, ...body] = rows;
  if (!header || !/^ID/.test(header[0] ?? '') || !(header[2] ?? '').startsWith('問い') || !(header[3] ?? '').startsWith('回答')) throw new Error(`unexpected header: ${JSON.stringify(header)}`);
  const categories = [];
  const index = new Map();
  const items = [];
  const seen = new Set();
  for (const row of body) {
    const id = String(row[0] ?? '').trim();
    const question = cleanText(row[2]), answer = cleanText(row[3]);
    if (!id || id === 'EOF' || !question || !answer || seen.has(id)) continue;
    seen.add(id);
    let category = cleanText(row[1]);
    if (!category || category.startsWith('#')) category = 'その他';
    if (!index.has(category)) { index.set(category, categories.length); categories.push(category); }
    items.push([id, index.get(category), question, answer]);
  }
  return { source, categories, items };
}
