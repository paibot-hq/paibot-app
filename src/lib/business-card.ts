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
  title: string;
  phone: string;
  email: string;
  website: string;
  address: string;
};

export const EMPTY_CARD: CardData = { name: "", reading: "", company: "", title: "", phone: "", email: "", website: "", address: "" };

export const TEMPLATES = ["simple", "stripe", "center"] as const;
export type Template = (typeof TEMPLATES)[number];

// Fixed print colors (not theme colors): the card is printed on white paper.
export const COLORS = ["#2f5d8a", "#1f7a5a", "#b3452c", "#6b4fa0", "#333333"] as const;

export const CONTACT_FIELDS = ["phone", "email", "website", "address"] as const satisfies readonly (keyof CardData)[];

const escape = (value: string) => value.replace(/[\\,;]/g, match => `\\${match}`).replace(/\r?\n/g, "\\n");

// vCard 3.0, which phone cameras read as "add contact". Empty fields are left out.
export function buildVCard(card: CardData): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  const name = card.name.trim();
  lines.push(`N:${escape(name)};;;;`, `FN:${escape(name)}`);
  const optional: [string, string][] = [
    ["ORG", card.company], ["TITLE", card.title], ["TEL;TYPE=WORK,VOICE", card.phone],
    ["EMAIL;TYPE=INTERNET", card.email], ["URL", card.website], ["ADR;TYPE=WORK", card.address],
  ];
  for (const [key, value] of optional) {
    const text = value.trim();
    if (!text) continue;
    // ADR's seven parts: only the street part carries the free-form address.
    lines.push(key.startsWith("ADR") ? `${key}:;;${escape(text)};;;;` : `${key}:${escape(text)}`);
  }
  lines.push("END:VCARD");
  return lines.join("\r\n");
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

// The font size (mm) that keeps `text` within `maxWidth` mm, never above `size`.
export function fitSize(text: string, size: number, maxWidth: number): number {
  const ems = textEms(text);
  return ems === 0 ? size : Math.min(size, maxWidth / ems);
}
