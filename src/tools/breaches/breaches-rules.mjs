// The rules the incident list (src/data/breaches.json) must keep, so that a wrong or unsourced entry cannot be merged. Offline and pure: the unit
// test runs them on every pull request; scripts/check-breaches.mjs adds the network checks (do the links open, do they say what the entry says).
//
// An entry may be published only if it has at least one https source and says how well it was checked:
//   official  - a page of the organization itself (its notice, press release or a government/university page) is among the sources
//   reported  - at least two different outlets agree, and none of them is only a copy of the other
//   single    - only one outlet (or an aggregator) was found; shown with a warning, and the first to be re-checked
export const TYPES = ['leak', 'ransomware', 'outage', 'fraud', 'other'];
export const VERIFICATIONS = ['official', 'reported', 'single'];
export const SOURCE_KINDS = ['official', 'press', 'aggregator'];

const DATE = /^\d{4}-\d{2}(-\d{2})?$/;
const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Every number written in a text, "約872万4,000件" -> 8724000, "1.4億" -> 140000000, "53,866件" -> 53866, "2,950名" -> 2950.
export function numbersIn(text) {
  const out = [];
  for (const m of text.matchAll(/(?:(\d[\d,]*(?:\.\d+)?)億)?(?:(\d[\d,]*(?:\.\d+)?)万)?(\d[\d,]*)?/g)) {
    if (!m[0]) continue;
    const num = value => Number(value.replace(/,/g, ''));
    out.push(Math.round((m[1] ? num(m[1]) * 1e8 : 0) + (m[2] ? num(m[2]) * 1e4 : 0) + (m[3] ? num(m[3]) : 0)));
  }
  return out;
}

// Numbers as the entry's text may write them: 8724000 -> 872万4,000 / 872万4000 / 8,724,000 / 8724000.
export function numberForms(n) {
  const forms = new Set([String(n), n.toLocaleString('en-US')]);
  if (n >= 10000) {
    const man = Math.floor(n / 10000), rest = n % 10000;
    forms.add(rest ? `${man.toLocaleString('en-US')}万${rest.toLocaleString('en-US')}` : `${man.toLocaleString('en-US')}万`);
    forms.add(rest ? `${man}万${rest}` : `${man}万`);
    if (n % 1000 === 0) forms.add(`${n / 10000}万`); // 246000 -> 24.6万
  }
  return [...forms];
}

export function validateBreaches(data) {
  const problems = [];
  const bad = (item, message) => problems.push(`${item?.id ?? '?'}: ${message}`);
  if (!FULL_DATE.test(data.asOf ?? '')) problems.push('asOf must be YYYY-MM-DD');
  if (!Array.isArray(data.items) || !data.items.length) { problems.push('items must be a list'); return problems; }
  const ids = new Set();
  for (const item of data.items) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.id ?? '')) bad(item, 'id must be kebab-case');
    if (ids.has(item.id)) bad(item, 'duplicate id'); ids.add(item.id);
    if (!DATE.test(item.date ?? '')) bad(item, `date "${item.date}" must be YYYY-MM or YYYY-MM-DD`);
    else if (item.date > data.asOf) bad(item, `date ${item.date} is after asOf ${data.asOf}`);
    if (!item.name?.trim()) bad(item, 'name is empty');
    if (!TYPES.includes(item.type)) bad(item, `type "${item.type}" is not one of ${TYPES.join(', ')}`);
    if (item.count !== null && !(Number.isInteger(item.count) && item.count > 0)) bad(item, 'count must be a positive integer or null');
    if (item.count !== null && !item.countNote?.trim()) bad(item, 'a count needs countNote, the words as published');
    if (item.count !== null && item.countNote && !numbersIn(item.countNote).some(n => Math.abs(n - item.count) <= item.count * 0.02)) bad(item, `count ${item.count} is not found in countNote "${item.countNote}"`);
    if (typeof item.countNote !== 'string' || typeof item.data !== 'string' || typeof item.cause !== 'string' || typeof item.note !== 'string') bad(item, 'countNote, data, cause and note must be strings (may be empty)');
    if (!item.cause?.trim() && item.type !== 'fraud') bad(item, 'cause is empty');
    if (!VERIFICATIONS.includes(item.verification)) bad(item, `verification "${item.verification}" is not one of ${VERIFICATIONS.join(', ')}`);
    if (!FULL_DATE.test(item.checkedAt ?? '') || item.checkedAt > data.asOf) bad(item, 'checkedAt must be YYYY-MM-DD and not after asOf');
    const sources = item.sources;
    if (!Array.isArray(sources) || !sources.length) { bad(item, 'at least one source is needed'); continue; }
    for (const source of sources) {
      if (!source.name?.trim()) bad(item, 'a source has no name');
      if (!SOURCE_KINDS.includes(source.kind)) bad(item, `source kind "${source.kind}" is not one of ${SOURCE_KINDS.join(', ')}`);
      try {
        const url = new URL(source.url);
        if (url.protocol !== 'https:' || url.username || url.password) bad(item, `${source.url}: https without credentials only`);
      } catch { bad(item, `${source.url}: not a URL`); }
    }
    const urls = sources.map(source => source.url);
    if (new Set(urls).size !== urls.length) bad(item, 'the same URL twice');
    const hosts = new Set(sources.map(source => { try { return new URL(source.url).hostname.replace(/^www\./, ''); } catch { return ''; } }));
    const independent = sources.filter(source => source.kind !== 'aggregator');
    if (item.verification === 'official' && !sources.some(source => source.kind === 'official')) bad(item, 'official needs a source of kind official');
    if (item.verification === 'reported' && (independent.length < 2 || hosts.size < 2)) bad(item, 'reported needs two sources from different sites, not counting aggregators');
    if (item.verification === 'single' && sources.length > 3) bad(item, 'single with many sources: upgrade it to reported');
    if (item.verification !== 'official' && sources.some(source => source.kind === 'official')) bad(item, `has an official source but is "${item.verification}"`);
  }
  return problems;
}
