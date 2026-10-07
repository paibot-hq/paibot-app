// Reading and removing what an Office file (docx, xlsx, pptx: a ZIP of XML parts) carries besides its content: who made and last saved it, when,
// the company, the software, custom properties, the small picture of its first page, who wrote the comments and tracked changes, and the metadata
// of the pictures inside it. Removing leaves the content and the layout as they are: the property parts are emptied, the small picture is left out,
// the pictures' own metadata is removed (as for any picture), and, if asked, the names on comments and changes are replaced by "Author".
import { content, encode, readZip, rewriteZip, text, type Entry } from "./zip.ts";
import { emptyExtras, readImage, stripImage, type Group, type Report, type Tag } from "./image.ts";

export type OfficeFormat = "docx" | "xlsx" | "pptx";

export function officeFormat(entries: readonly Pick<Entry, "name">[]): OfficeFormat | null {
  const names = new Set(entries.map(entry => entry.name));
  if (!names.has("[Content_Types].xml")) return null;
  if (names.has("word/document.xml")) return "docx";
  if (names.has("xl/workbook.xml")) return "xlsx";
  if (names.has("ppt/presentation.xml")) return "pptx";
  return null;
}

const unescapeXml = (value: string) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, "&");
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const element = (xml: string, name: string): string => {
  const m = new RegExp(`<${escapeRegExp(name)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeRegExp(name)}>`).exec(xml);
  return m ? unescapeXml(m[1].replace(/<[^>]+>/g, "")).trim() : "";
};
// "2026-10-05T14:03:21Z" -> "2026-10-05 14:03:21 UTC"
const when = (value: string) => value.replace(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?Z$/, "$1 $2 UTC");

const CORE: [string, string, Group][] = [
  ["dc:creator", "Creator", "person"], ["cp:lastModifiedBy", "LastModifiedBy", "person"], ["dcterms:created", "Created", "time"], ["dcterms:modified", "Modified", "time"],
  ["cp:lastPrinted", "LastPrinted", "time"], ["dc:title", "Title", "document"], ["dc:subject", "Subject", "document"], ["cp:keywords", "Keywords", "document"],
  ["dc:description", "Description", "document"], ["cp:category", "Category", "document"], ["cp:revision", "Revision", "document"],
];
const APP: [string, string, Group][] = [
  ["Application", "Application", "software"], ["AppVersion", "AppVersion", "software"], ["Company", "Company", "person"], ["Manager", "Manager", "person"],
  ["Template", "Template", "software"], ["TotalTime", "TotalTime", "document"], ["HyperlinkBase", "HyperlinkBase", "document"],
];

const find = (entries: Entry[], name: string) => entries.find(entry => entry.name === name);
const isMedia = (name: string) => /(^|\/)media\/[^/]+\.(jpe?g|png)$/i.test(name);
// The parts where names of comment authors and of those who changed the text are written.
const isAuthorPart = (name: string) => /^(word\/(document|comments\w*|people|footnotes|endnotes)\.xml|xl\/(comments\d*|persons\/person|threadedComments\/[^/]+)\.xml|ppt\/(commentAuthors|comments\/[^/]+|authors)\.xml)$/.test(name);

// The names written as authors in a part: w:author="...", <author>...</author>, name="..." of a PowerPoint comment author, displayName="..." of a person.
function authorsIn(name: string, xml: string): string[] {
  const found: string[] = [];
  for (const m of xml.matchAll(/\bw(?:15)?:author="([^"]*)"/g)) found.push(m[1]);
  for (const m of xml.matchAll(/<author>([^<]*)<\/author>/g)) found.push(m[1]);
  if (/commentAuthors|authors\.xml/.test(name)) for (const m of xml.matchAll(/<p\d*:cmAuthor\b[^>]*\bname="([^"]*)"/g)) found.push(m[1]);
  if (/person/.test(name)) for (const m of xml.matchAll(/\bdisplayName="([^"]*)"/g)) found.push(m[1]);
  return found.map(unescapeXml).map(s => s.trim()).filter(Boolean);
}

export async function readOffice(bytes: Uint8Array): Promise<Report | null> {
  let entries: Entry[];
  try { entries = readZip(bytes); } catch { return null; }
  const format = officeFormat(entries);
  if (!format) return null;
  const report: Report = { format, tags: [], gps: null, orientation: null, extras: emptyExtras() };
  const read = async (entry: Entry | undefined) => { try { return entry ? text(await content(entry)) : ""; } catch { return ""; } };
  const core = await read(find(entries, "docProps/core.xml"));
  for (const [name, key, group] of CORE) {
    const value = element(core, name);
    if (value) report.tags.push({ group, key, value: group === "time" ? when(value) : value });
  }
  const app = await read(find(entries, "docProps/app.xml"));
  for (const [name, key, group] of APP) {
    const value = element(app, name);
    if (value) report.tags.push({ group, key, value });
  }
  const custom = await read(find(entries, "docProps/custom.xml"));
  for (const m of custom.matchAll(/<property\b[^>]*\bname="([^"]*)"[^>]*>([\s\S]*?)<\/property>/g)) {
    const value = unescapeXml(m[2].replace(/<[^>]+>/g, "")).trim();
    if (value) report.tags.push({ group: "custom", key: unescapeXml(m[1]), value: value.slice(0, 300) });
  }
  report.extras.thumbnail = entries.some(entry => /^docProps\/thumbnail\.[a-z]+$/i.test(entry.name));

  // Comments, changes and the names on them.
  const authors = new Set<string>();
  for (const entry of entries) {
    if (!isAuthorPart(entry.name)) continue;
    const xml = await read(entry);
    for (const author of authorsIn(entry.name, xml)) authors.add(author);
    if (/comments/i.test(entry.name) && /<(w:comment|comment|p\d*:cm|threadedComment)\b/.test(xml)) report.extras.comments = true;
    if (entry.name === "word/document.xml" && /<w:(ins|del|moveFrom|moveTo)\s[^>]*w:author=/.test(xml)) report.extras.trackedChanges = true;
  }
  for (const author of [...authors].slice(0, 20)) report.tags.push({ group: "person", key: "CommentAuthor", value: author });

  // The pictures inside: those that carry metadata of their own (a position, a camera...).
  for (const entry of entries.filter(e => isMedia(e.name) && e.size < 40_000_000)) {
    let picture: Report;
    try { picture = readImage(await content(entry)); } catch { continue; }
    if (picture.tags.some(tag => tag.key !== "Orientation")) {
      report.extras.embeddedPhotos++;
      if (picture.gps && !report.gps) {
        report.gps = picture.gps;
        report.tags.push({ group: "location", key: "GPSLatitude", value: String(Number(picture.gps.lat.toFixed(6))) }, { group: "location", key: "GPSLongitude", value: String(Number(picture.gps.lon.toFixed(6))) });
      }
    }
  }
  return report;
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const EMPTY_CORE = `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>`;
const EMPTY_APP = `${XML_HEAD}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"/>`;
const EMPTY_CUSTOM = `${XML_HEAD}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"/>`;

// The names on comments and changes written over with "Author" (and the initials with "A").
export function anonymize(name: string, xml: string): string {
  let out = xml.replace(/\b(w(?:15)?:author)="[^"]*"/g, '$1="Author"').replace(/\b(w:initials)="[^"]*"/g, '$1="A"').replace(/<author>[^<]*<\/author>/g, "<author>Author</author>");
  if (/commentAuthors|authors\.xml/.test(name)) out = out.replace(/(<p\d*:cmAuthor\b[^>]*?\b)name="[^"]*"/g, '$1name="Author"').replace(/(<p\d*:cmAuthor\b[^>]*?\b)initials="[^"]*"/g, '$1initials="A"');
  if (/person/.test(name)) out = out.replace(/\b(displayName)="[^"]*"/g, '$1="Author"').replace(/\b(userId)="[^"]*"/g, '$1="Author"').replace(/\b(providerId)="[^"]*"/g, '$1="None"');
  return out;
}

export async function stripOffice(bytes: Uint8Array, options: { anonymizeAuthors?: boolean } = {}): Promise<Uint8Array | null> {
  let entries: Entry[];
  try { entries = readZip(bytes); } catch { return null; }
  if (!officeFormat(entries)) return null;
  const changes = new Map<string, Uint8Array | null>();
  if (find(entries, "docProps/core.xml")) changes.set("docProps/core.xml", encode(EMPTY_CORE));
  if (find(entries, "docProps/app.xml")) changes.set("docProps/app.xml", encode(EMPTY_APP));
  if (find(entries, "docProps/custom.xml")) changes.set("docProps/custom.xml", encode(EMPTY_CUSTOM));
  // The small picture of the first page is left out, and so is the relationship that points to it (or the file would not open cleanly).
  const thumbnails = entries.filter(entry => /^docProps\/thumbnail\.[a-z]+$/i.test(entry.name));
  for (const entry of thumbnails) changes.set(entry.name, null);
  const rels = find(entries, "_rels/.rels");
  if (rels && thumbnails.length > 0) {
    let xml = text(await content(rels));
    for (const entry of thumbnails) xml = xml.replace(new RegExp(`<Relationship\\b[^>]*Target="/?${escapeRegExp(entry.name)}"[^>]*/>`, "g"), "");
    changes.set("_rels/.rels", encode(xml));
  }
  // The pictures inside lose their own metadata.
  for (const entry of entries.filter(e => isMedia(e.name))) {
    try {
      const stripped = stripImage(await content(entry));
      if (stripped) changes.set(entry.name, stripped);
    } catch { /* a picture that cannot be read is left as it is */ }
  }
  if (options.anonymizeAuthors) {
    for (const entry of entries.filter(e => isAuthorPart(e.name))) {
      const xml = text(await content(entry));
      const replaced = anonymize(entry.name, xml);
      if (replaced !== xml) changes.set(entry.name, encode(replaced));
    }
  }
  return rewriteZip(entries, changes);
}
