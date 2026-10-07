// Reading and removing what a photo carries besides its picture: the EXIF of a JPEG or PNG (camera, time, GPS position, owner, ...), and the
// other metadata next to it (XMP, IPTC, comments, text chunks, data stuck on the end of the file). Removing is lossless for those two formats:
// the segments or chunks are left out and the picture's data is copied as it is. Pure functions on bytes, tested without a browser.

export type Format = "jpeg" | "png" | "other";
export type Group = "location" | "time" | "device" | "person" | "shot" | "image" | "software" | "text";
export type Tag = { group: Group; key: string; value: string };
export type Report = {
  format: Format;
  tags: Tag[];
  // Position from the GPS tags, in degrees (negative: south, west) and metres.
  gps: { lat: number; lon: number; altitude: number | null } | null;
  orientation: number | null;
  // Metadata that is there but is not listed tag by tag.
  extras: { xmp: boolean; iptc: boolean; comment: boolean; trailer: boolean; thumbnail: boolean; makerNote: boolean };
};

export function detectFormat(bytes: Uint8Array): Format {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  return "other";
}

// --- TIFF / EXIF ---------------------------------------------------------------------------------------------------------------------------

// [name, group] of the tags listed; every other tag is not shown (the number of them is not kept).
const IFD0: Record<number, [string, Group]> = {
  0x010e: ["ImageDescription", "person"], 0x010f: ["Make", "device"], 0x0110: ["Model", "device"], 0x0131: ["Software", "software"],
  0x0132: ["DateTime", "time"], 0x013b: ["Artist", "person"], 0x8298: ["Copyright", "person"], 0x0112: ["Orientation", "image"],
};
const EXIF: Record<number, [string, Group]> = {
  0x829a: ["ExposureTime", "shot"], 0x829d: ["FNumber", "shot"], 0x8827: ["ISO", "shot"], 0x9003: ["DateTimeOriginal", "time"],
  0x9004: ["DateTimeDigitized", "time"], 0x9010: ["OffsetTime", "time"], 0x9011: ["OffsetTimeOriginal", "time"], 0x9204: ["ExposureBias", "shot"],
  0x9209: ["Flash", "shot"], 0x920a: ["FocalLength", "shot"], 0x9286: ["UserComment", "person"], 0xa002: ["PixelXDimension", "image"],
  0xa003: ["PixelYDimension", "image"], 0xa405: ["FocalLengthIn35mm", "shot"], 0xa430: ["CameraOwnerName", "person"],
  0xa431: ["BodySerialNumber", "device"], 0xa433: ["LensMake", "device"], 0xa434: ["LensModel", "device"], 0xa435: ["LensSerialNumber", "device"],
  0xa420: ["ImageUniqueID", "device"],
};

type Value = string | number[] | Uint8Array;
const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

class Tiff {
  private view: DataView;
  private bytes: Uint8Array;
  private start: number;
  private little: boolean;
  constructor(bytes: Uint8Array, start: number, little: boolean) {
    this.bytes = bytes; this.start = start; this.little = little;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  u16(offset: number) { return this.view.getUint16(offset, this.little); }
  u32(offset: number) { return this.view.getUint32(offset, this.little); }
  // The entries of the IFD at `offset` (from the start of the TIFF data) as tag -> value. Out-of-range reads are skipped, never thrown.
  ifd(offset: number): Map<number, Value> {
    const out = new Map<number, Value>();
    const base = this.start + offset;
    if (offset < 8 || base + 2 > this.bytes.length) return out;
    const count = Math.min(this.u16(base), 512);
    for (let i = 0; i < count; i++) {
      const entry = base + 2 + i * 12;
      if (entry + 12 > this.bytes.length) break;
      const tag = this.u16(entry), type = this.u16(entry + 2), n = this.u32(entry + 4);
      const size = (TYPE_SIZE[type] ?? 0) * n;
      if (size === 0 || size > this.bytes.length) continue;
      const at = size <= 4 ? entry + 8 : this.start + this.u32(entry + 8);
      if (at + size > this.bytes.length) continue;
      out.set(tag, this.value(type, n, at));
    }
    return out;
  }
  private value(type: number, n: number, at: number): Value {
    const numbers = (read: (o: number) => number, step: number) => Array.from({ length: n }, (_, i) => read(at + i * step));
    switch (type) {
      case 2: return new TextDecoder("latin1").decode(this.bytes.subarray(at, at + n)).replace(/\0+$/, "").replace(/\0/g, " ").trim();
      case 3: return numbers(o => this.u16(o), 2);
      case 4: return numbers(o => this.u32(o), 4);
      case 9: return numbers(o => this.view.getInt32(o, this.little), 4);
      case 5: return Array.from({ length: n }, (_, i) => { const d = this.u32(at + i * 8 + 4); return d === 0 ? 0 : this.u32(at + i * 8) / d; });
      case 10: return Array.from({ length: n }, (_, i) => { const d = this.view.getInt32(at + i * 8 + 4, this.little); return d === 0 ? 0 : this.view.getInt32(at + i * 8, this.little) / d; });
      default: return this.bytes.slice(at, at + n * (TYPE_SIZE[type] ?? 1));
    }
  }
}

const num = (value: Value | undefined): number | null => (Array.isArray(value) && typeof value[0] === "number" ? value[0] : null);
const text = (value: Value | undefined): string => (typeof value === "string" ? value : "");

// "2026:10:05 14:03:21" -> "2026-10-05 14:03:21" (what is not that is kept as it is).
const dateText = (value: string) => value.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
const trim = (n: number, digits = 4) => String(Number(n.toFixed(digits)));

function show(name: string, value: Value): string {
  if (typeof value === "string") return name.startsWith("DateTime") ? dateText(value) : value;
  if (value instanceof Uint8Array) {
    // UserComment starts with an 8-byte character code ("ASCII\0\0\0", "UNICODE\0").
    if (name === "UserComment") return new TextDecoder(String.fromCharCode(...value.subarray(0, 7)) === "UNICODE" ? "utf-16be" : "utf-8").decode(value.subarray(8)).replace(/\0/g, "").trim();
    return "";
  }
  const first = value[0];
  if (first === undefined) return "";
  switch (name) {
    case "ExposureTime": return first > 0 && first < 1 ? `1/${Math.round(1 / first)}` : trim(first, 2);
    case "FNumber": return `f/${trim(first, 1)}`;
    case "FocalLength": case "FocalLengthIn35mm": return `${trim(first, 1)} mm`;
    case "ExposureBias": return `${first > 0 ? "+" : ""}${trim(first, 2)} EV`;
    case "OffsetTime": return String(first);
    default: return value.length > 1 ? value.join(", ") : String(first);
  }
}

const dms = (value: Value | undefined): number | null => (Array.isArray(value) && value.length >= 3 ? value[0] + value[1] / 60 + value[2] / 3600 : null);

export function readTiff(tiff: Uint8Array, start = 0): { tags: Tag[]; gps: Report["gps"]; orientation: number | null; thumbnail: boolean; makerNote: boolean } {
  const empty = { tags: [], gps: null, orientation: null, thumbnail: false, makerNote: false };
  if (tiff.length < start + 8) return empty;
  const little = tiff[start] === 0x49 && tiff[start + 1] === 0x49;
  if (!little && !(tiff[start] === 0x4d && tiff[start + 1] === 0x4d)) return empty;
  const reader = new Tiff(tiff, start, little);
  if (reader.u16(start + 2) !== 42) return empty;
  const tags: Tag[] = [];
  const add = (table: Record<number, [string, Group]>, ifd: Map<number, Value>) => {
    for (const [tag, [name, group]] of Object.entries(table)) {
      const value = ifd.get(Number(tag));
      const shown = value === undefined ? "" : show(name, value);
      if (shown !== "") tags.push({ group, key: name, value: shown });
    }
  };
  const first = reader.ifd(reader.u32(start + 4));
  add(IFD0, first);
  const exifPointer = num(first.get(0x8769));
  const exif = exifPointer ? reader.ifd(exifPointer) : new Map<number, Value>();
  add(EXIF, exif);
  let gps: Report["gps"] = null;
  const gpsPointer = num(first.get(0x8825));
  if (gpsPointer) {
    const g = reader.ifd(gpsPointer);
    const lat = dms(g.get(2)), lon = dms(g.get(4));
    if (lat !== null && lon !== null) {
      const altitude = num(g.get(6));
      gps = {
        lat: (text(g.get(1)).toUpperCase() === "S" ? -1 : 1) * lat,
        lon: (text(g.get(3)).toUpperCase() === "W" ? -1 : 1) * lon,
        altitude: altitude === null ? null : (num(g.get(5)) === 1 ? -1 : 1) * altitude,
      };
      tags.push({ group: "location", key: "GPSLatitude", value: trim(gps.lat, 6) }, { group: "location", key: "GPSLongitude", value: trim(gps.lon, 6) });
      if (gps.altitude !== null) tags.push({ group: "location", key: "GPSAltitude", value: `${trim(gps.altitude, 1)} m` });
    }
    const stamp = text(g.get(0x1d));
    if (stamp) tags.push({ group: "location", key: "GPSDateStamp", value: dateText(stamp) });
    const direction = num(g.get(0x11));
    if (direction !== null) tags.push({ group: "location", key: "GPSImgDirection", value: `${trim(direction, 0)}°` });
  }
  // The next IFD (IFD1) is the thumbnail, a small copy of the picture that can show what was cropped away.
  const ifd0 = start + reader.u32(start + 4);
  const count = ifd0 + 2 <= tiff.length ? reader.u16(ifd0) : 0;
  const nextAt = ifd0 + 2 + count * 12;
  const thumbnail = nextAt + 4 <= tiff.length && reader.u32(nextAt) !== 0;
  return { tags, gps, orientation: num(first.get(0x0112)), thumbnail, makerNote: exif.has(0x927c) };
}

// --- JPEG -----------------------------------------------------------------------------------------------------------------------------------

type Segment = { marker: number; start: number; end: number; payload: number };
const ascii = (bytes: Uint8Array, start: number, length: number) => String.fromCharCode(...bytes.subarray(start, Math.min(start + length, bytes.length)));

// The marker segments of a JPEG up to the end of the picture (its EOI), and where that is. The data of each scan (entropy-coded) is stepped over.
function jpegSegments(bytes: Uint8Array): { segments: Segment[]; end: number; eoi: boolean } | null {
  if (detectFormat(bytes) !== "jpeg") return null;
  const segments: Segment[] = [];
  let i = 2;
  while (i + 1 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xff) { i++; continue; }
    if (marker === 0xd9) return { segments, end: i + 2, eoi: true };
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { segments.push({ marker, start: i, end: i + 2, payload: i + 2 }); i += 2; continue; }
    if (i + 4 > bytes.length) return null;
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    const end = i + 2 + length;
    if (length < 2 || end > bytes.length) return null;
    segments.push({ marker, start: i, end, payload: i + 4 });
    i = end;
    if (marker === 0xda) {
      // The scan's data runs to the next marker that is not a stuffed 0xFF00 or a restart.
      while (i + 1 < bytes.length && !(bytes[i] === 0xff && bytes[i + 1] !== 0x00 && !(bytes[i + 1] >= 0xd0 && bytes[i + 1] <= 0xd7) && bytes[i + 1] !== 0xff)) i++;
      segments[segments.length - 1].end = i;
    }
  }
  // The file ends without an EOI (cut short, or made so): what is there is the picture.
  return segments.some(s => s.marker === 0xda) ? { segments, end: bytes.length, eoi: false } : null;
}

const isExif = (bytes: Uint8Array, s: Segment) => s.marker === 0xe1 && ascii(bytes, s.payload, 6) === "Exif\0\0";
const isXmp = (bytes: Uint8Array, s: Segment) => s.marker === 0xe1 && ascii(bytes, s.payload, 28).startsWith("http://ns.adobe.com/xap/1.0/");

// What is kept when metadata is removed: the picture's own segments (tables, frame, scans), the JFIF header, the colour profile and Adobe's colour flag.
function keep(bytes: Uint8Array, s: Segment): boolean {
  const m = s.marker;
  if (m === 0xe0) return true;
  if (m === 0xe2) return ascii(bytes, s.payload, 12) === "ICC_PROFILE\0";
  if (m === 0xee) return ascii(bytes, s.payload, 5) === "Adobe";
  if (m === 0xfe) return false;
  if (m >= 0xe1 && m <= 0xef) return false;
  return true;
}

// A tiny EXIF block with only the orientation: without it a photo taken sideways would show sideways once the real one is gone.
export function orientationOnly(orientation: number, little = false): Uint8Array {
  const out = new Uint8Array(10 + 8 + 2 + 12 + 4);
  out.set([0xff, 0xe1, 0, out.length - 2, 0x45, 0x78, 0x69, 0x66, 0, 0]);
  const view = new DataView(out.buffer);
  const t = 10;
  out.set(little ? [0x49, 0x49] : [0x4d, 0x4d], t);
  view.setUint16(t + 2, 42, little);
  view.setUint32(t + 4, 8, little);
  view.setUint16(t + 8, 1, little);
  view.setUint16(t + 10, 0x0112, little);
  view.setUint16(t + 12, 3, little);
  view.setUint32(t + 14, 1, little);
  view.setUint16(t + 18, orientation, little);
  return out;
}

export function stripJpeg(bytes: Uint8Array): Uint8Array | null {
  const parsed = jpegSegments(bytes);
  if (!parsed) return null;
  const exif = parsed.segments.find(s => isExif(bytes, s));
  const orientation = exif ? readTiff(bytes, exif.payload + 6).orientation : null;
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let orientationPlaced = orientation === null || orientation === 1 || orientation < 1 || orientation > 8;
  for (const s of parsed.segments) {
    if (!keep(bytes, s)) continue;
    parts.push(bytes.subarray(s.start, s.end));
    // After the header segment (JFIF, or the first one when there is none), the orientation.
    if (!orientationPlaced && s.marker === 0xe0) { parts.push(orientationOnly(orientation!)); orientationPlaced = true; }
  }
  if (!orientationPlaced) parts.splice(1, 0, orientationOnly(orientation!));
  if (parsed.eoi) parts.push(bytes.subarray(parsed.end - 2, parsed.end));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

function reportJpeg(bytes: Uint8Array): Report {
  const report: Report = { format: "jpeg", tags: [], gps: null, orientation: null, extras: { xmp: false, iptc: false, comment: false, trailer: false, thumbnail: false, makerNote: false } };
  const parsed = jpegSegments(bytes);
  if (!parsed) return report;
  for (const s of parsed.segments) {
    if (isExif(bytes, s)) {
      const read = readTiff(bytes, s.payload + 6);
      report.tags.push(...read.tags);
      report.gps = read.gps; report.orientation = read.orientation;
      report.extras.thumbnail = read.thumbnail; report.extras.makerNote = read.makerNote;
    } else if (isXmp(bytes, s)) report.extras.xmp = true;
    else if (s.marker === 0xed) report.extras.iptc = true;
    else if (s.marker === 0xfe) report.extras.comment = true;
  }
  // Anything after the picture's end (some phones add a second picture or a block of their own there).
  report.extras.trailer = parsed.eoi && bytes.length - parsed.end > 2;
  return report;
}

// --- PNG ------------------------------------------------------------------------------------------------------------------------------------

const PNG_REMOVED = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);
type Chunk = { type: string; start: number; end: number; data: number };

function pngChunks(bytes: Uint8Array): Chunk[] | null {
  if (detectFormat(bytes) !== "png") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: Chunk[] = [];
  let i = 8;
  while (i + 12 <= bytes.length) {
    const length = view.getUint32(i);
    const end = i + 12 + length;
    if (end > bytes.length) return null;
    const type = ascii(bytes, i + 4, 4);
    chunks.push({ type, start: i, end, data: i + 8 });
    i = end;
    if (type === "IEND") break;
  }
  return chunks.length > 0 && chunks[chunks.length - 1].type === "IEND" ? chunks : null;
}

export function stripPng(bytes: Uint8Array): Uint8Array | null {
  const chunks = pngChunks(bytes);
  if (!chunks) return null;
  const kept = chunks.filter(c => !PNG_REMOVED.has(c.type));
  const out = new Uint8Array(8 + kept.reduce((n, c) => n + c.end - c.start, 0));
  out.set(bytes.subarray(0, 8));
  let at = 8;
  for (const c of kept) { out.set(bytes.subarray(c.start, c.end), at); at += c.end - c.start; }
  return out;
}

function reportPng(bytes: Uint8Array): Report {
  const report: Report = { format: "png", tags: [], gps: null, orientation: null, extras: { xmp: false, iptc: false, comment: false, trailer: false, thumbnail: false, makerNote: false } };
  const chunks = pngChunks(bytes);
  if (!chunks) return report;
  for (const c of chunks) {
    if (c.type === "eXIf") {
      const read = readTiff(bytes, c.data);
      report.tags.push(...read.tags); report.gps = read.gps; report.orientation = read.orientation;
      report.extras.thumbnail = read.thumbnail; report.extras.makerNote = read.makerNote;
    } else if (c.type === "tEXt" || c.type === "iTXt" || c.type === "zTXt") {
      const end = c.end - 4;
      let zero = c.data;
      while (zero < end && bytes[zero] !== 0) zero++;
      const key = ascii(bytes, c.data, zero - c.data);
      if (key === "XML:com.adobe.xmp") { report.extras.xmp = true; continue; }
      // Text is shown for tEXt (Latin-1); for the others only that the keyword is there. (Image makers put prompts and settings here.)
      const value = c.type === "tEXt" ? new TextDecoder("latin1").decode(bytes.subarray(zero + 1, end)).slice(0, 300) : "…";
      report.tags.push({ group: "text", key, value });
    } else if (c.type === "tIME" && c.end - c.data - 4 >= 7) {
      const view = new DataView(bytes.buffer, bytes.byteOffset + c.data, 7);
      const two = (n: number) => String(n).padStart(2, "0");
      report.tags.push({ group: "time", key: "tIME", value: `${view.getUint16(0)}-${two(view.getUint8(2))}-${two(view.getUint8(3))} ${two(view.getUint8(4))}:${two(view.getUint8(5))}:${two(view.getUint8(6))}` });
    }
  }
  return report;
}

// --- Both -----------------------------------------------------------------------------------------------------------------------------------

export function readMetadata(bytes: Uint8Array): Report {
  const format = detectFormat(bytes);
  if (format === "jpeg") return reportJpeg(bytes);
  if (format === "png") return reportPng(bytes);
  return { format, tags: [], gps: null, orientation: null, extras: { xmp: false, iptc: false, comment: false, trailer: false, thumbnail: false, makerNote: false } };
}

// The file without its metadata, byte for byte otherwise; null when the format is not one of these two (or the file is damaged).
export function stripMetadata(bytes: Uint8Array): Uint8Array | null {
  const format = detectFormat(bytes);
  return format === "jpeg" ? stripJpeg(bytes) : format === "png" ? stripPng(bytes) : null;
}

// Whether the report has anything that can say who, where or when: a position, a time, a serial number, an owner or text of the maker's.
export type SensitiveGroup = "location" | "time" | "device" | "person" | "text";
export function sensitive(report: Pick<Report, "tags">): SensitiveGroup[] {
  const groups = new Set<SensitiveGroup>();
  for (const tag of report.tags) {
    if (tag.group === "location" || tag.group === "time" || tag.group === "person" || tag.group === "text") groups.add(tag.group);
    if (tag.group === "device" && /Serial|UniqueID/.test(tag.key)) groups.add("device");
  }
  return [...groups];
}
