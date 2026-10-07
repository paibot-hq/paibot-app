// Photos made for the tests (and the browser flow): a JPEG or PNG with the metadata a phone's photo has, built byte by byte.

// A real 1x1 JPEG, for the browser to show.
export const TINY_JPEG = Buffer.concat([Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64'), Buffer.from([0xff, 0xd9])]);

const u16 = (n, little) => { const b = Buffer.alloc(2); little ? b.writeUInt16LE(n) : b.writeUInt16BE(n); return b; };
const u32 = (n, little) => { const b = Buffer.alloc(4); little ? b.writeUInt32LE(n) : b.writeUInt32BE(n); return b; };

// An IFD: entries are [tag, type, values], types 2 (ASCII, a string), 3 (SHORT), 4 (LONG) and 5 (RATIONAL, [numerator, denominator] pairs, flat).
// Values that do not fit in 4 bytes go after the table; `base` is where this IFD sits in the TIFF data.
function ifd(entries, base, little) {
  const sorted = [...entries].sort((a, b) => a[0] - b[0]);
  const tableSize = 2 + sorted.length * 12 + 4;
  const table = [u16(sorted.length, little)];
  const extra = [];
  let offset = base + tableSize;
  for (const [tag, type, values] of sorted) {
    let data;
    if (type === 2) data = Buffer.from(`${values}\0`, 'latin1');
    else if (type === 3) data = Buffer.concat(values.map(v => u16(v, little)));
    else if (type === 4) data = Buffer.concat(values.map(v => u32(v, little)));
    else data = Buffer.concat(values.map(v => u32(v, little)));
    const count = type === 5 ? values.length / 2 : type === 2 ? data.length : values.length;
    const entry = [u16(tag, little), u16(type, little), u32(count, little)];
    if (data.length <= 4) entry.push(Buffer.concat([data, Buffer.alloc(4 - data.length)]));
    else { entry.push(u32(offset, little)); extra.push(data); offset += data.length; }
    table.push(Buffer.concat(entry));
  }
  table.push(u32(0, little));
  return Buffer.concat([...table, ...extra]);
}

// The TIFF data of an EXIF block: a camera, a time, settings, a serial number and a GPS position.
export function tiffBlock({ little = false, orientation = 1, gps = true, thumbnail = false } = {}) {
  const ifd0Base = 8;
  const build = (exifAt, gpsAt, next) => ifd([
    [0x010f, 2, 'TestCam'], [0x0110, 2, 'TC-100'], [0x0112, 3, [orientation]], [0x0131, 2, 'TestSoft 1.0'], [0x0132, 2, '2026:10:05 14:03:21'],
    [0x013b, 2, 'Taro Yamada'], [0x8769, 4, [exifAt]], ...(gps ? [[0x8825, 4, [gpsAt]]] : []),
  ], ifd0Base, little);
  // Sizes first, then the real offsets.
  const exifEntries = [
    [0x829a, 5, [1, 250]], [0x829d, 5, [18, 10]], [0x8827, 3, [200]], [0x9003, 2, '2026:10:05 14:03:20'], [0xa431, 2, 'SN12345'],
    [0xa434, 2, 'TestLens 24mm'], [0x920a, 5, [26, 1]],
  ];
  const gpsEntries = [
    [1, 2, 'N'], [2, 5, [35, 1, 41, 1, 222, 10]], [3, 2, 'E'], [4, 5, [139, 1, 41, 1, 30, 1]], [5, 3, [0]], [6, 5, [40, 1]],
  ];
  const ifd0Size = build(0, 0).length;
  const exifBase = ifd0Base + ifd0Size;
  const exifBlock = ifd(exifEntries, exifBase, little);
  const gpsBase = exifBase + exifBlock.length;
  const gpsBlock = ifd(gpsEntries, gpsBase, little);
  let ifd0 = build(exifBase, gpsBase);
  let tail = Buffer.alloc(0);
  if (thumbnail) {
    // IFD0's "next IFD" pointer (right after its table) points to an IFD1 after the rest: the thumbnail's.
    const ifd1At = gpsBase + (gps ? gpsBlock.length : 0);
    tail = ifd([[0x0103, 3, [6]]], ifd1At, little);
    const at = 2 + (little ? ifd0.readUInt16LE(0) : ifd0.readUInt16BE(0)) * 12;
    little ? ifd0.writeUInt32LE(ifd1At, at) : ifd0.writeUInt32BE(ifd1At, at);
  }
  const header = Buffer.concat([Buffer.from(little ? 'II' : 'MM', 'latin1'), u16(42, little), u32(ifd0Base, little)]);
  return Buffer.concat([header, ifd0, exifBlock, ...(gps ? [gpsBlock] : []), tail]);
}

export function segment(marker, payload) {
  return Buffer.concat([Buffer.from([0xff, marker]), u16(payload.length + 2, false), payload]);
}
export const exifSegment = options => segment(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiffBlock(options)]));
export const xmpSegment = () => segment(0xe1, Buffer.from('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>owner</x:xmpmeta>', 'latin1'));
export const iptcSegment = () => segment(0xed, Buffer.from('Photoshop 3.0\0' + '8BIM', 'latin1'));
export const commentSegment = () => segment(0xfe, Buffer.from('made by a phone'));
export const iccSegment = () => segment(0xe2, Buffer.concat([Buffer.from('ICC_PROFILE\0\x01\x01', 'latin1'), Buffer.alloc(20, 7)]));

// A JPEG with the given segments right after SOI (or after the base's JFIF header), and an optional trailer after its end.
export function jpeg({ base = TINY_JPEG, segments = [], trailer = null } = {}) {
  // The base is SOI, JFIF (APP0), then the picture.
  const jfifLength = base.readUInt16BE(4);
  const afterJfif = 2 + 2 + jfifLength;
  return Buffer.concat([base.subarray(0, afterJfif), ...segments, base.subarray(afterJfif), ...(trailer ? [trailer] : [])]);
}

export const phonePhoto = (options = {}) => jpeg({
  segments: [exifSegment(options), xmpSegment(), iptcSegment(), commentSegment(), iccSegment()],
  trailer: Buffer.from('SEFHtrailerdata-from-the-phone'),
});

// A PNG: signature, IHDR, the given chunks, IDAT, IEND (the data is not a real picture; only the structure is).
const crc = () => Buffer.alloc(4);
export function chunk(type, data) { return Buffer.concat([u32(data.length, false), Buffer.from(type, 'latin1'), data, crc()]); }
export function png(extra = []) {
  const ihdr = Buffer.concat([u32(1, false), u32(1, false), Buffer.from([8, 2, 0, 0, 0])]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), ...extra, chunk('IDAT', Buffer.from([1, 2, 3])), chunk('IEND', Buffer.alloc(0))]);
}
export const phonePng = () => png([
  chunk('eXIf', tiffBlock({ little: false })), chunk('tEXt', Buffer.from('parameters\0a red fox, seed 42', 'latin1')),
  chunk('tIME', Buffer.from([0x07, 0xea, 10, 5, 14, 3, 21])), chunk('pHYs', Buffer.alloc(9)),
]);

// --- Office files ----------------------------------------------------------------------------------------------------------------------------

import { deflateRawSync } from 'node:zlib';

const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t.push(c >>> 0); } return t; })();
const crc32 = buffer => { let c = 0xffffffff; for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

// A ZIP: entries are [name, content, deflate?]; a data descriptor is used for the deflated ones (as Office does), so that the local headers carry no sizes.
export function zip(entries) {
  const locals = [], central = [];
  let offset = 0;
  for (const [name, content, deflate] of entries) {
    const raw = Buffer.from(content), data = deflate ? deflateRawSync(raw) : raw, nameBuffer = Buffer.from(name, 'utf8'), crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800 | (deflate ? 8 : 0), 6); local.writeUInt16LE(deflate ? 8 : 0, 8);
    local.writeUInt16LE(0x6000, 10); local.writeUInt16LE(0x5aa1, 12);
    if (!deflate) { local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(raw.length, 22); }
    local.writeUInt16LE(nameBuffer.length, 26);
    const descriptor = Buffer.alloc(deflate ? 16 : 0);
    if (deflate) { descriptor.writeUInt32LE(0x08074b50, 0); descriptor.writeUInt32LE(crc, 4); descriptor.writeUInt32LE(data.length, 8); descriptor.writeUInt32LE(raw.length, 12); }
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x800 | (deflate ? 8 : 0), 8); entry.writeUInt16LE(deflate ? 8 : 0, 10);
    entry.writeUInt16LE(0x6000, 12); entry.writeUInt16LE(0x5aa1, 14); entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(data.length, 20); entry.writeUInt32LE(raw.length, 24);
    entry.writeUInt16LE(nameBuffer.length, 28); entry.writeUInt32LE(offset, 42);
    locals.push(local, nameBuffer, data, descriptor); central.push(entry, nameBuffer);
    offset += 30 + nameBuffer.length + data.length + descriptor.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const CORE = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
  + '<dc:title>Secret plan</dc:title><dc:creator>Taro Yamada</dc:creator><cp:lastModifiedBy>Hanako Sato</cp:lastModifiedBy><cp:revision>7</cp:revision>'
  + '<dcterms:created xsi:type="dcterms:W3CDTF">2026-10-05T14:03:21Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2026-10-06T09:30:00Z</dcterms:modified></cp:coreProperties>';
const APP = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
  + '<Template>Normal.dotm</Template><TotalTime>42</TotalTime><Application>Microsoft Office Word</Application><Company>Example &amp; Co</Company><AppVersion>16.0000</AppVersion></Properties>';
const CUSTOM = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
  + '<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="ProjectCode"><vt:lpwstr>X-42</vt:lpwstr></property></Properties>';
const RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
  + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
  + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
  + '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail" Target="docProps/thumbnail.jpeg"/></Relationships>';
const TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="xml" ContentType="application/xml"/></Types>';
export const DOCUMENT_XML = `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body><w:p><w:r><w:t>Hello, 世界</w:t></w:r></w:p><w:ins w:id="1" w:author="Taro Yamada" w:date="2026-10-05T14:03:21Z"><w:r><w:t>added</w:t></w:r></w:ins></w:body></w:document>`;
export const COMMENTS_XML = `<?xml version="1.0" encoding="UTF-8"?><w:comments ${NS}><w:comment w:id="0" w:author="Hanako Sato" w:date="2026-10-06T09:00:00Z" w:initials="HS"><w:p><w:r><w:t>check this</w:t></w:r></w:p></w:comment></w:comments>`;

// A Word file with everything an office adds: properties, a custom property, a small picture, a comment, a tracked change and a photo with a position.
export const docx = () => zip([
  ['[Content_Types].xml', TYPES], ['_rels/.rels', RELS, true], ['word/document.xml', DOCUMENT_XML, true], ['word/comments.xml', COMMENTS_XML, true],
  ['docProps/core.xml', CORE, true], ['docProps/app.xml', APP, true], ['docProps/custom.xml', CUSTOM], ['docProps/thumbnail.jpeg', TINY_JPEG],
  ['word/media/image1.jpeg', phonePhoto({ orientation: 1 })],
]);

export const xlsx = () => zip([
  ['[Content_Types].xml', TYPES], ['_rels/.rels', RELS.replace('word/document.xml', 'xl/workbook.xml'), true], ['xl/workbook.xml', '<workbook/>', true],
  ['xl/comments1.xml', '<comments><authors><author>Taro Yamada</author></authors><commentList><comment ref="A1" authorId="0"><text><r><t>note</t></r></text></comment></commentList></comments>', true],
  ['docProps/core.xml', CORE, true], ['docProps/app.xml', APP.replace('Word', 'Excel'), true],
]);

export const pptx = () => zip([
  ['[Content_Types].xml', TYPES], ['_rels/.rels', RELS.replace('word/document.xml', 'ppt/presentation.xml'), true], ['ppt/presentation.xml', '<p:presentation/>', true],
  ['ppt/commentAuthors.xml', '<p:cmAuthorLst xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cmAuthor id="0" name="Taro Yamada" initials="TY" lastIdx="1" clrIdx="0"/></p:cmAuthorLst>'],
  ['docProps/core.xml', CORE, true], ['docProps/app.xml', APP.replace('Word', 'PowerPoint'), true],
]);
