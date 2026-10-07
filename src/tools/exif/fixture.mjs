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
