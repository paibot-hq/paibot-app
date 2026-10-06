import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestInfo } from '../../src/lib/ip-info.ts';

test('the facts come from the request headers and the cf data', () => {
  const headers = new Headers({ 'cf-connecting-ip': '203.0.113.7', 'user-agent': 'Mozilla/5.0 Test', 'accept-language': 'ja,en;q=0.8' });
  const info = requestInfo(headers, { country: 'jp', region: 'Tokyo', city: 'Shinjuku', timezone: 'Asia/Tokyo', asn: 64500, asOrganization: 'Example Net', colo: 'NRT', httpProtocol: 'HTTP/3', tlsVersion: 'TLSv1.3', latitude: '35.6', longitude: '139.7' });
  assert.deepEqual(info, { ip: '203.0.113.7', country: 'JP', region: 'Tokyo', city: 'Shinjuku', timezone: 'Asia/Tokyo', asn: 64500, organization: 'Example Net', colo: 'NRT', protocol: 'HTTP/3', tls: 'TLSv1.3', userAgent: 'Mozilla/5.0 Test', acceptLanguage: 'ja,en;q=0.8' });
  assert.ok(!('latitude' in info), 'no coordinates');
});

test('what is missing is null, and odd values are not passed on', () => {
  const none = requestInfo(new Headers(), undefined);
  assert.ok(Object.values(none).every(v => v === null));
  const odd = requestInfo(new Headers({ 'user-agent': 'x'.repeat(1000) }), { country: 'Japan', asn: 'x', city: '  ', region: 5 });
  assert.equal(odd.country, null); assert.equal(odd.asn, null); assert.equal(odd.city, null); assert.equal(odd.region, null);
  assert.equal(odd.userAgent.length, 400);
});
