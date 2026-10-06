// A small reader for the first sheet of an .xlsx file, with nothing but Node: an .xlsx is a ZIP of XML files. It reads values only (no
// formulas, no macros are run), which is all the FAQ file needs.
import { inflateRawSync } from 'node:zlib';

// The files in a ZIP, by name: found through the central directory at the end, then stored (0) or deflated (8).
export function readZip(buffer) {
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66000); i--) if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error('not a ZIP file');
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const files = new Map();
  for (let n = 0; n < count; n++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('broken ZIP directory');
    const method = buffer.readUInt16LE(offset + 10);
    const size = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28), extraLength = buffer.readUInt16LE(offset + 30), commentLength = buffer.readUInt16LE(offset + 32);
    const local = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(start, start + size);
    files.set(name, method === 0 ? data : method === 8 ? inflateRawSync(data) : (() => { throw new Error(`ZIP method ${method} is not supported`); })());
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export const unescapeXml = text => text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
  if (code[0] === '#') return String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10));
  return ENTITIES[code] ?? whole;
});

// The shared strings: the text of each <si>, its runs (<t>) joined (phonetic guides, <rPh>, are left out).
export function parseSharedStrings(xml) {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(([, si]) => unescapeXml([...si.replace(/<rPh[\s\S]*?<\/rPh>/g, '').matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join('')));
}

const columnIndex = letters => [...letters].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

// The rows of a sheet as arrays of strings (empty where a cell is empty).
export function parseSheet(xml, strings) {
  const rows = [];
  for (const [, body] of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const m of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = m[1], inner = m[2] ?? '';
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs);
      if (!ref) continue;
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
      let value = '';
      if (type === 'inlineStr') value = unescapeXml([...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join(''));
      else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        if (v !== undefined) value = type === 's' ? strings[Number(v)] ?? '' : unescapeXml(v);
      }
      row[columnIndex(ref[1])] = value;
    }
    rows.push(Array.from(row, v => v ?? ''));
  }
  return rows;
}

// The first sheet of a workbook.
export function readFirstSheet(buffer) {
  const files = readZip(buffer);
  const sheet = files.get('xl/worksheets/sheet1.xml');
  if (!sheet) throw new Error('no first sheet');
  const strings = files.has('xl/sharedStrings.xml') ? parseSharedStrings(files.get('xl/sharedStrings.xml').toString('utf8')) : [];
  return parseSheet(sheet.toString('utf8'), strings);
}
