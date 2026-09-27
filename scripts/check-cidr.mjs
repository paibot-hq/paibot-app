import assert from 'node:assert/strict';
import { formatAddress, formatBinary, parseCidr } from '../src/lib/cidr.ts';

// Expected values are written out by hand, not derived from the code under test.
const cases = [
  ['192.168.1.10/24', { network: '192.168.1.0', broadcast: '192.168.1.255', mask: '255.255.255.0', wildcard: '0.0.0.255', first: '192.168.1.1', last: '192.168.1.254', hosts: 254, total: 256, prefix: 24, kind: 'private' }],
  ['10.20.30.40/255.255.240.0', { network: '10.20.16.0', broadcast: '10.20.31.255', mask: '255.255.240.0', wildcard: '0.0.15.255', first: '10.20.16.1', last: '10.20.31.254', hosts: 4094, total: 4096, prefix: 20, kind: 'private' }],
  ['172.31.255.1 255.255.255.252', { network: '172.31.255.0', broadcast: '172.31.255.3', first: '172.31.255.1', last: '172.31.255.2', hosts: 2, total: 4, prefix: 30, kind: 'private' }],
  ['203.0.113.7/31', { network: '203.0.113.6', broadcast: '203.0.113.7', first: '203.0.113.6', last: '203.0.113.7', hosts: 2, total: 2, prefix: 31, kind: 'public' }],
  ['8.8.8.8', { network: '8.8.8.8', broadcast: '8.8.8.8', first: '8.8.8.8', last: '8.8.8.8', hosts: 1, total: 1, prefix: 32, kind: 'public' }],
  ['0.0.0.0/0', { network: '0.0.0.0', broadcast: '255.255.255.255', mask: '0.0.0.0', wildcard: '255.255.255.255', hosts: 4294967294, total: 4294967296, prefix: 0, kind: 'unspecified' }],
  ['255.255.255.255/1', { network: '128.0.0.0', broadcast: '255.255.255.255', mask: '128.0.0.0', prefix: 1, kind: 'reserved' }],
  ['127.0.0.1/8', { network: '127.0.0.0', kind: 'loopback' }],
  ['169.254.10.20/16', { network: '169.254.0.0', kind: 'linkLocal' }],
  ['100.64.1.1/10', { network: '100.64.0.0', broadcast: '100.127.255.255', kind: 'sharedAddress' }],
  ['224.0.0.251/32', { kind: 'multicast' }],
  [' 172.16.5.4 / 12 ', { network: '172.16.0.0', broadcast: '172.31.255.255', kind: 'private' }],
];
for (const [input, expected] of cases) {
  const r = parseCidr(input);
  assert.ok(r, `${input} should parse`);
  const actual = {
    network: formatAddress(r.network), broadcast: formatAddress(r.broadcast), mask: formatAddress(r.mask), wildcard: formatAddress(r.wildcard),
    first: formatAddress(r.firstHost), last: formatAddress(r.lastHost), hosts: r.hostCount, total: r.totalCount, prefix: r.prefix, kind: r.kind,
  };
  for (const [key, value] of Object.entries(expected)) assert.equal(actual[key], value, `${input}: ${key}`);
}
assert.equal(formatBinary(parseCidr('192.168.1.10/24').mask), '11111111.11111111.11111111.00000000');

for (const input of ['', '192.168.1', '192.168.1.256/24', '192.168.1.1/33', '192.168.01.1/24', '192.168.1.1/255.0.255.0', '192.168.1.1024', 'a.b.c.d/8', '1.2.3.4/-1', '1.2.3.4//24']) {
  assert.equal(parseCidr(input), null, `${JSON.stringify(input)} should be rejected`);
}
console.log(`PASS: ${cases.length} CIDR inputs (masks, /31, /32, /0, address kinds) and invalid input rejection`);
