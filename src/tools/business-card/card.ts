// Business card data and the pure helpers behind the card maker: the
// contact block and text sizing. Everything runs in the browser; nothing
// entered here is sent anywhere.

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

// "stripe" is the classic Japanese layout (and the default): a dark band down the left.
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
