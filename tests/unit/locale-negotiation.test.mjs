import assert from 'node:assert/strict';
import { localeFromAcceptLanguage, localeFromCookie } from '../../src/i18n/negotiate.ts';

assert.equal(localeFromAcceptLanguage(null), null, 'crawlers send no header');
assert.equal(localeFromAcceptLanguage(''), null);
assert.equal(localeFromAcceptLanguage('en-US,en;q=0.9,ja;q=0.8'), 'en');
assert.equal(localeFromAcceptLanguage('zh-TW,zh;q=0.9'), 'zh', 'region subtags are ignored');
assert.equal(localeFromAcceptLanguage('fr-FR,fr;q=0.9,en;q=0.5,ja;q=0.7'), 'ja', 'highest q among supported');
assert.equal(localeFromAcceptLanguage('ja;q=0.5, EN;q=0.5'), 'ja', 'ties keep header order; case-insensitive');
assert.equal(localeFromAcceptLanguage('en;q=0, ja'), 'ja', 'q=0 means not acceptable');
assert.equal(localeFromAcceptLanguage('fr, de;q=0.8, *;q=0.1'), null, 'unsupported only');
assert.equal(localeFromAcceptLanguage('en;q=abc, zh'), 'zh', 'malformed q is ignored');
assert.equal(localeFromCookie('a=1; locale=zh; b=2'), 'zh');
assert.equal(localeFromCookie('locale=fr'), null);
assert.equal(localeFromCookie(null), null);
console.log('PASS: Accept-Language and locale cookie negotiation');
