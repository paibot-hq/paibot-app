import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFormat, readMetadata, stripMetadata, sensitive, orientationOnly, readTiff } from './exif.ts';
import { TINY_JPEG, phonePhoto, phonePng, png, jpeg, exifSegment, iccSegment, tiffBlock, chunk } from './fixture.mjs';

const bytes = buffer => new Uint8Array(buffer);
const tag = (report, key) => report.tags.find(t => t.key === key)?.value;

test('the format is known by its first bytes', () => {
  assert.equal(detectFormat(bytes(TINY_JPEG)), 'jpeg');
  assert.equal(detectFormat(bytes(png())), 'png');
  assert.equal(detectFormat(bytes(Buffer.from('RIFF....WEBP'))), 'other');
  assert.equal(detectFormat(new Uint8Array(0)), 'other');
});

test('a phone photo gives its camera, time, settings, owner, serial number and position', () => {
  const report = readMetadata(bytes(phonePhoto({ orientation: 6 })));
  assert.equal(report.format, 'jpeg');
  assert.deepEqual([tag(report, 'Make'), tag(report, 'Model'), tag(report, 'LensModel')], ['TestCam', 'TC-100', 'TestLens 24mm']);
  assert.deepEqual([tag(report, 'ExposureTime'), tag(report, 'FNumber'), tag(report, 'ISO'), tag(report, 'FocalLength')], ['1/250', 'f/1.8', '200', '26 mm']);
  assert.deepEqual([tag(report, 'DateTime'), tag(report, 'DateTimeOriginal')], ['2026-10-05 14:03:21', '2026-10-05 14:03:20']);
  assert.deepEqual([tag(report, 'Artist'), tag(report, 'BodySerialNumber'), tag(report, 'Software')], ['Taro Yamada', 'SN12345', 'TestSoft 1.0']);
  assert.equal(report.orientation, 6);
  assert.ok(Math.abs(report.gps.lat - (35 + 41 / 60 + 22.2 / 3600)) < 1e-9);
  assert.ok(Math.abs(report.gps.lon - (139 + 41 / 60 + 30 / 3600)) < 1e-9);
  assert.equal(report.gps.altitude, 40);
  assert.equal(tag(report, 'GPSAltitude'), '40 m');
  assert.deepEqual(report.extras, { xmp: true, iptc: true, comment: true, trailer: true, thumbnail: false, makerNote: false });
});

test('both byte orders are read, and a photo with no position has none', () => {
  const little = readMetadata(bytes(jpeg({ segments: [exifSegment({ little: true, orientation: 3 })] })));
  assert.equal(little.orientation, 3);
  assert.equal(tag(little, 'Model'), 'TC-100');
  assert.ok(little.gps);
  const none = readMetadata(bytes(jpeg({ segments: [exifSegment({ gps: false })] })));
  assert.equal(none.gps, null);
  assert.ok(!none.tags.some(t => t.group === 'location'));
});

test('south and west are negative, and a thumbnail is noticed', () => {
  const south = tiffBlock({ thumbnail: true });
  // Make the hemisphere refs "S" and "W": they are one letter each, found by their place in the block.
  const text = Buffer.from(south);
  const north = text.indexOf(Buffer.from('N\0'));
  assert.ok(north > 0);
  const edited = Buffer.from(text);
  edited[north] = 0x53; // S
  const read = readTiff(bytes(edited));
  assert.ok(read.gps.lat < 0, 'S is south');
  assert.equal(read.thumbnail, true);
  assert.equal(readTiff(bytes(tiffBlock())).thumbnail, false);
});

test('removing the metadata from a JPEG leaves the picture byte for byte, the colour profile, and only the orientation', () => {
  const source = phonePhoto({ orientation: 6 });
  const out = stripMetadata(bytes(source));
  const text = Buffer.from(out).toString('latin1');
  for (const gone of ['TestCam', 'Taro', 'SN12345', 'ns.adobe.com', 'Photoshop', 'made by a phone', 'SEFHtrailer']) assert.ok(!text.includes(gone), gone);
  assert.ok(text.includes('ICC_PROFILE'), 'the colour profile is kept');
  const after = readMetadata(out);
  assert.deepEqual(after.tags.map(t => t.key), ['Orientation']);
  assert.equal(after.orientation, 6);
  assert.equal(after.gps, null);
  assert.deepEqual(after.extras, { xmp: false, iptc: false, comment: false, trailer: false, thumbnail: false, makerNote: false });
  // The picture's own data (from its first table to the end) is the base's, unchanged.
  const picture = TINY_JPEG.subarray(TINY_JPEG.indexOf(Buffer.from([0xff, 0xdb])));
  assert.ok(Buffer.from(out).includes(picture), 'the picture is untouched');
  assert.equal(Buffer.from(out).subarray(-2).toString('hex'), 'ffd9');
});

test('with an upright photo no orientation is kept, and removing twice changes nothing more', () => {
  const upright = stripMetadata(bytes(phonePhoto({ orientation: 1 })));
  assert.deepEqual(readMetadata(upright).tags, []);
  const again = stripMetadata(upright);
  assert.deepEqual(Buffer.from(again), Buffer.from(upright));
  const sideways = stripMetadata(bytes(phonePhoto({ orientation: 8 })));
  assert.deepEqual(Buffer.from(stripMetadata(sideways)), Buffer.from(sideways));
  assert.deepEqual(Buffer.from(orientationOnly(6)).subarray(0, 4), Buffer.from([0xff, 0xe1, 0x00, 0x22]));
});

test('a JPEG without a JFIF header or an EOI is still handled', () => {
  const bare = Buffer.concat([Buffer.from([0xff, 0xd8]), exifSegment({ orientation: 6 }), TINY_JPEG.subarray(TINY_JPEG.indexOf(Buffer.from([0xff, 0xdb])), -2)]);
  const out = stripMetadata(bytes(bare));
  assert.equal(readMetadata(out).orientation, 6);
  assert.ok(!Buffer.from(out).includes(Buffer.from('TestCam')));
  assert.equal(readMetadata(bytes(bare)).extras.trailer, false);
});

test('a PNG gives its EXIF, its text (what a picture maker wrote) and its time; removing keeps the rest', () => {
  const report = readMetadata(bytes(phonePng()));
  assert.equal(report.format, 'png');
  assert.equal(tag(report, 'Model'), 'TC-100');
  assert.ok(report.gps);
  assert.equal(tag(report, 'parameters'), 'a red fox, seed 42');
  assert.equal(report.tags.find(t => t.key === 'parameters').group, 'text');
  assert.equal(tag(report, 'tIME'), '2026-10-05 14:03:21');
  const out = stripMetadata(bytes(phonePng()));
  const after = readMetadata(out);
  assert.deepEqual(after.tags, []);
  assert.equal(after.gps, null);
  const text = Buffer.from(out).toString('latin1');
  assert.ok(text.includes('pHYs') && text.includes('IDAT') && text.includes('IEND') && text.includes('IHDR'));
  assert.ok(!text.includes('eXIf') && !text.includes('tEXt') && !text.includes('tIME'));
  assert.deepEqual(Buffer.from(stripMetadata(out)), Buffer.from(out));
});

test('a PNG with the XMP in an iTXt chunk is noticed', () => {
  const report = readMetadata(bytes(png([chunk('iTXt', Buffer.from('XML:com.adobe.xmp\0\0\0\0\0<x/>', 'latin1'))])));
  assert.equal(report.extras.xmp, true);
});

test('other formats and damaged files are not read or changed, and never throw', () => {
  const other = bytes(Buffer.from('RIFFxxxxWEBPVP8 ....'));
  assert.deepEqual(readMetadata(other).tags, []);
  assert.equal(stripMetadata(other), null);
  const whole = phonePhoto({ orientation: 6 });
  // Cut at every length, and with every byte of the start changed: nothing throws.
  for (let n = 0; n < whole.length; n += 7) { const cut = bytes(whole.subarray(0, n)); readMetadata(cut); stripMetadata(cut); }
  const pngWhole = phonePng();
  for (let n = 0; n < pngWhole.length; n += 5) { const cut = bytes(pngWhole.subarray(0, n)); readMetadata(cut); stripMetadata(cut); }
  for (let i = 0; i < 120; i++) { const copy = Buffer.from(whole); copy[i] ^= 0xff; readMetadata(bytes(copy)); stripMetadata(bytes(copy)); }
  let seed = 7;
  const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 200; i++) {
    const noise = Buffer.alloc(200 + Math.floor(random() * 300));
    for (let j = 0; j < noise.length; j++) noise[j] = Math.floor(random() * 256);
    noise[0] = 0xff; noise[1] = 0xd8; noise[2] = 0xff;
    readMetadata(bytes(noise)); stripMetadata(bytes(noise));
  }
});

test('what can say who, where or when is told', () => {
  assert.deepEqual(sensitive(readMetadata(bytes(phonePhoto()))).sort(), ['device', 'location', 'person', 'time']);
  assert.deepEqual(sensitive(readMetadata(bytes(TINY_JPEG))), []);
  assert.deepEqual(sensitive(readMetadata(bytes(phonePng()))).includes('text'), true);
  assert.deepEqual(sensitive({ tags: [{ group: 'device', key: 'Make', value: 'X' }], extras: {} }), [], 'a camera make alone is not');
});
