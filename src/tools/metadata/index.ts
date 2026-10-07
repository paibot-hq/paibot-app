// One door for every kind of file: a picture (image.ts) or an Office file (office.ts). Told apart by the first bytes, not by the name.
import { detectFormat, emptyExtras, readImage, stripImage, type Report } from "./image.ts";
import { readOffice, stripOffice } from "./office.ts";

export { sensitive, type Group, type Report, type Tag } from "./image.ts";

const isZip = (bytes: Uint8Array) => bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
const unknown = (): Report => ({ format: "other", tags: [], gps: null, orientation: null, extras: emptyExtras() });

export async function readMetadata(bytes: Uint8Array): Promise<Report> {
  if (detectFormat(bytes) !== "other") return readImage(bytes);
  if (isZip(bytes)) return (await readOffice(bytes)) ?? unknown();
  return unknown();
}

// The file without its metadata; null when it is not a kind that can be handled (the page then draws a picture again, or refuses).
export async function stripMetadata(bytes: Uint8Array, options: { anonymizeAuthors?: boolean } = {}): Promise<Uint8Array | null> {
  if (detectFormat(bytes) !== "other") return stripImage(bytes);
  if (isZip(bytes)) return stripOffice(bytes, options);
  return null;
}
