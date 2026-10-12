import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countText, parseLimit, limitStatus } from './count.ts';

const family = '\u{1F468}‍\u{1F469}‍\u{1F467}';
const flag = '\u{1F1EF}\u{1F1F5}';

test('plain text, kana and a single emoji count as what they look like', () => {
  assert.deepEqual(countText(''), { characters: 0, withoutSpaces: 0, codePoints: 0, utf16: 0, utf8: 0 });
  assert.equal(countText('Aあ\u{1F600}').characters, 3);
  assert.deepEqual(countText('あ'), { characters: 1, withoutSpaces: 1, codePoints: 1, utf16: 1, utf8: 3 });
});

test('an emoji made of several code points is one character, with the other counts kept for developers', () => {
  // Same numbers as measured in four languages (JavaScript, Python, Swift, Rust).
  assert.deepEqual(countText(family), { characters: 1, withoutSpaces: 1, codePoints: 5, utf16: 8, utf8: 18 });
  assert.deepEqual(countText(flag), { characters: 1, withoutSpaces: 1, codePoints: 2, utf16: 4, utf8: 8 });
  assert.deepEqual(countText('\u{20BB7}野家'), { characters: 3, withoutSpaces: 3, codePoints: 3, utf16: 4, utf8: 10 });
});

test('a kana written with a combining dakuten is still one character, whichever way it is typed', () => {
  assert.equal(countText('が').characters, 1);
  assert.deepEqual(countText('が'), { characters: 1, withoutSpaces: 1, codePoints: 2, utf16: 2, utf8: 6 });
});

test('the count without spaces leaves out spaces, the ideographic space, tabs and every kind of line break', () => {
  assert.equal(countText(' a　b\tc\nd\r\ne ').characters, 11);
  assert.equal(countText(' a　b\tc\nd\r\ne ').withoutSpaces, 5);
  assert.equal(countText('   \n\n').withoutSpaces, 0);
  assert.equal(countText('\r\n').characters, 1, 'CRLF is one character as seen');
});

test('the limit box accepts only whole numbers of 1 or more', () => {
  assert.equal(parseLimit('400'), 400);
  assert.equal(parseLimit(' 12 '), 12);
  for (const bad of ['', '0', '-3', '1.5', '1e3', 'abc', '１２', '9999999999']) assert.equal(parseLimit(bad), null, bad);
});

test('the limit says how many are left, that the limit is reached, or how many are over', () => {
  assert.deepEqual(limitStatus(7, null), { state: 'none', amount: 0 });
  assert.deepEqual(limitStatus(3, 10), { state: 'left', amount: 7 });
  assert.deepEqual(limitStatus(10, 10), { state: 'reached', amount: 0 });
  assert.deepEqual(limitStatus(13, 10), { state: 'over', amount: 3 });
});
