// IPv4 subnet arithmetic for the CIDR calculator. Addresses are unsigned
// 32-bit numbers; every result is recomputed from the parsed address and
// prefix, so the page never shows values that disagree with each other.

export type AddressKind = 'private' | 'loopback' | 'linkLocal' | 'sharedAddress' | 'multicast' | 'reserved' | 'unspecified' | 'public';

export interface CidrResult {
  address: number;
  prefix: number;
  mask: number;
  wildcard: number;
  network: number;
  broadcast: number;
  firstHost: number;
  lastHost: number;
  // Usable host addresses: /31 point-to-point links use both (RFC 3021) and a
  // /32 is a single host, so neither loses a network/broadcast address.
  hostCount: number;
  totalCount: number;
  kind: AddressKind;
}

function parseAddress(text: string): number | null {
  const parts = text.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || (part.length > 1 && part.startsWith('0'))) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

function maskToPrefix(mask: number): number | null {
  const inverted = (~mask) >>> 0;
  // A valid mask is ones then zeros, i.e. its inverse plus one is a power of two.
  if (((inverted + 1) & inverted) !== 0) return null;
  return 32 - Math.log2(inverted + 1);
}

export function prefixToMask(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

// Accepts "192.168.1.10/24", "192.168.1.10/255.255.255.0" or
// "192.168.1.10 255.255.255.0"; a bare address is treated as /32.
export function parseCidr(input: string): CidrResult | null {
  const match = input.trim().match(/^([\d.]+)(?:(?:\s*\/\s*|\s+)([\d.]+))?$/);
  if (!match) return null;
  const address = parseAddress(match[1]);
  if (address === null) return null;
  let prefix: number | null;
  if (!match[2]) prefix = 32;
  else if (/^\d{1,2}$/.test(match[2])) prefix = Number(match[2]) <= 32 ? Number(match[2]) : null;
  else {
    const mask = parseAddress(match[2]);
    prefix = mask === null ? null : maskToPrefix(mask);
  }
  if (prefix === null) return null;
  const mask = prefixToMask(prefix);
  const wildcard = (~mask) >>> 0;
  const network = (address & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const totalCount = 2 ** (32 - prefix);
  const edgesUsable = prefix >= 31;
  return {
    address, prefix, mask, wildcard, network, broadcast,
    firstHost: edgesUsable ? network : network + 1,
    lastHost: edgesUsable ? broadcast : broadcast - 1,
    hostCount: edgesUsable ? totalCount : totalCount - 2,
    totalCount,
    kind: addressKind(address),
  };
}

function inRange(address: number, base: string, prefix: number): boolean {
  const mask = prefixToMask(prefix);
  return ((address & mask) >>> 0) === ((parseAddress(base)! & mask) >>> 0);
}

// The special-purpose blocks people most often meet (RFC 1918, 6598, 3927,
// 5771, 1122); everything else is shown as public.
export function addressKind(address: number): AddressKind {
  if (address === 0) return 'unspecified';
  if (inRange(address, '10.0.0.0', 8) || inRange(address, '172.16.0.0', 12) || inRange(address, '192.168.0.0', 16)) return 'private';
  if (inRange(address, '127.0.0.0', 8)) return 'loopback';
  if (inRange(address, '169.254.0.0', 16)) return 'linkLocal';
  if (inRange(address, '100.64.0.0', 10)) return 'sharedAddress';
  if (inRange(address, '224.0.0.0', 4)) return 'multicast';
  if (inRange(address, '240.0.0.0', 4) || inRange(address, '0.0.0.0', 8)) return 'reserved';
  return 'public';
}

export function formatAddress(value: number): string {
  return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
}

export function formatBinary(value: number): string {
  return [24, 16, 8, 0].map(shift => ((value >>> shift) & 255).toString(2).padStart(8, '0')).join('.');
}
