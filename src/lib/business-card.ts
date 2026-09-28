import qrcode from "qrcode-generator";

// Business card data and the pure helpers behind the card maker: vCard text
// for the QR code, the QR module path, and text sizing. Everything runs in
// the browser; nothing entered here is sent anywhere.

// Encode QR payloads as UTF-8 so Japanese names and addresses survive. (The
// package's ESM build has no stringToBytesFuncs table; TextEncoder does it.)
const utf8 = new TextEncoder();
qrcode.stringToBytes = text => Array.from(utf8.encode(text));

// Standard Japanese business card size, in millimetres.
export const CARD = { width: 91, height: 55 } as const;

export type CardData = {
  name: string;
  reading: string;
  company: string;
  department: string;
  title: string;
  postalCode: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
};

export const EMPTY_CARD: CardData = {
  name: "", reading: "", company: "", department: "", title: "", postalCode: "", address: "", phone: "", fax: "", email: "", website: "",
};

// "stripe" is the classic Japanese layout (and the default): a dark band, mincho name.
export const TEMPLATES = ["stripe", "simple", "center"] as const;
export type Template = (typeof TEMPLATES)[number];

// Fixed print colors (not theme colors): the card is printed on white paper.
export const COLORS = ["#2f5d8a", "#1f7a5a", "#b3452c", "#6b4fa0", "#333333"] as const;

// The contact block, in the usual Japanese order: address, phone and fax,
// email, website. Empty items are left out.
// `postalMark` prefixes the postal code ("〒" in Japanese, nothing elsewhere).
export function contactLines(card: CardData, postalMark = ""): string[] {
  const value = (field: keyof CardData) => card[field].trim();
  const address = [value("postalCode") && `${postalMark}${value("postalCode")}`, value("address").replace(/\s*\n\s*/g, " ")].filter(Boolean).join(" ");
  const phones = [value("phone") && `TEL: ${value("phone")}`, value("fax") && `FAX: ${value("fax")}`].filter(Boolean).join("   ");
  return [address, phones, value("email") && `E-mail: ${value("email")}`, value("website")].filter(Boolean);
}

const escape = (value: string) => value.replace(/[\\,;]/g, match => `\\${match}`).replace(/\r?\n/g, "\\n");

// vCard 3.0, which phone cameras read as "add contact". Empty fields are left out.
export function buildVCard(card: CardData): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  const name = card.name.trim();
  lines.push(`N:${escape(name)};;;;`, `FN:${escape(name)}`);
  // ORG is "company;department".
  const company = card.company.trim(), department = card.department.trim();
  if (company || department) lines.push(`ORG:${escape(company)}${department ? `;${escape(department)}` : ""}`);
  const optional: [string, string][] = [
    ["TITLE", card.title], ["TEL;TYPE=WORK,VOICE", card.phone], ["TEL;TYPE=WORK,FAX", card.fax],
    ["EMAIL;TYPE=INTERNET", card.email], ["URL", card.website],
  ];
  for (const [key, value] of optional) {
    const text = value.trim();
    if (text) lines.push(`${key}:${escape(text)}`);
  }
  // ADR's seven parts: the free-form address in the street part, the postal code in its own.
  if (card.address.trim() || card.postalCode.trim()) lines.push(`ADR;TYPE=WORK:;;${escape(card.address.trim())};;;${escape(card.postalCode.trim())};`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

// What the card's QR code carries: nothing, the contact as a vCard (a phone
// camera offers to save it), or the website URL (the camera opens it).
export const QR_MODES = ["none", "contact", "website"] as const;
export type QrMode = (typeof QR_MODES)[number];

export function websiteUrl(website: string): string {
  const url = website.trim();
  // Only "scheme://" counts as a scheme, so "example.com:8080" still gets https://.
  return !url || /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

// The QR payload for a mode, or "" when there is nothing to encode.
export function qrPayload(card: CardData, mode: QrMode): string {
  if (mode === "contact") return card.name.trim() ? buildVCard(card) : "";
  if (mode === "website") return websiteUrl(card.website);
  return "";
}

// SVG path for the QR code of `text`, drawn in a size×size square at (x, y).
export function qrPath(text: string, x: number, y: number, size: number): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const cell = size / count;
  let path = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) path += `M${(x + col * cell).toFixed(3)} ${(y + row * cell).toFixed(3)}h${cell.toFixed(3)}v${cell.toFixed(3)}h${(-cell).toFixed(3)}z`;
    }
  }
  return path;
}

// Rough width of `text` in ems: full-width characters (CJK, kana, full-width
// forms) are 1em, everything else about 0.56em. Good enough to shrink a long
// line to fit; SVG has no text measuring before layout.
export function textEms(text: string): number {
  let ems = 0;
  for (const char of text) ems += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u.test(char) ? 1 : 0.56;
  return ems;
}

// The font size (mm) that keeps `text` within `maxWidth` mm, never above
// `size`; `spacing` is letter-spacing in ems between characters.
export function fitSize(text: string, size: number, maxWidth: number, spacing = 0): number {
  const ems = textEms(text) + spacing * Math.max(0, [...text].length - 1);
  return ems === 0 ? size : Math.min(size, maxWidth / ems);
}
