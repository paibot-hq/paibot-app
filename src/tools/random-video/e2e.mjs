// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. Wikidata and YouTube are stood in for, so
// the flow needs neither (nor their being up): the list is four videos, two of which "cannot be embedded".
import assert from 'node:assert/strict';

const VIDEOS = [['goodVideo01', 'Q11', 'First song'], ['badVideo001', 'Q12', 'Not embeddable'], ['goodVideo02', 'Q13', 'Second song'], ['badVideo002', 'Q14', 'Removed']];
const answer = { results: { bindings: VIDEOS.map(([id, item, label]) => ({ id: { value: id }, item: { value: `http://www.wikidata.org/entity/${item}` }, itemLabel: { value: label }, itemDescription: { value: `about ${label}` } })) } };

// A player with the API's shape: it shows which video it plays and how many it has loaded, says "cannot be embedded"
// (150) for the bad ones, and window.__endVideo() ends the one playing.
const FAKE_API = `
window.YT = { PlayerState: { ENDED: 0 }, Player: class {
  constructor(element, options) { this.options = options; this.box = document.createElement('div'); this.box.dataset.fakePlayer = ''; element.replaceWith(this.box); window.__endVideo = () => options.events.onStateChange({ data: 0 }); this.loadVideoById(options.videoId); }
  loadVideoById(id) { this.box.dataset.playing = id; this.box.dataset.loads = String(Number(this.box.dataset.loads ?? 0) + 1); if (id.startsWith('bad')) setTimeout(() => this.options.events.onError({ data: 150 }), 0); }
  destroy() {}
} };
window.onYouTubeIframeAPIReady();`;

export default async function ({ page, main, go }) {
  let asked = 0;
  await page.route('https://query.wikidata.org/**', route => { asked++; route.fulfill({ json: answer, headers: { 'Access-Control-Allow-Origin': '*' } }); });
  await page.route('https://www.youtube.com/iframe_api', route => route.fulfill({ body: FAKE_API, contentType: 'text/javascript' }));
  await go('random-video');
  assert.equal(asked, 0, 'nothing is asked of Wikidata before a video is wanted');
  const info = main.locator('[data-random-video="info"]');
  const playing = () => main.locator('[data-fake-player]').getAttribute('data-playing');

  // The first press plays a good video (a bad one is skipped by itself), with its name, description and links.
  await main.locator('[data-random-video="start"]').click();
  await page.waitForFunction(() => document.querySelector('[data-fake-player]')?.dataset.playing?.startsWith('good') && document.querySelector('[data-random-video="info"]')?.dataset.video?.startsWith('good'));
  const first = await info.getAttribute('data-video');
  assert.equal(await playing(), first);
  const [, item, title] = VIDEOS.find(([id]) => id === first);
  assert.match(await info.innerText(), new RegExp(`${title}[\\s\\S]*about ${title}`));
  assert.equal(await info.getByRole('link', { name: 'Watch on YouTube' }).getAttribute('href'), `https://www.youtube.com/watch?v=${first}`);
  assert.equal(await info.getByRole('link', { name: 'See on Wikidata' }).getAttribute('href'), `https://www.wikidata.org/wiki/${item}`);
  assert.ok(asked >= 1);

  // "Next" and the end of a video (with "play the next" on) each go on, past the ones that cannot be played. (The list
  // comes round again, so the next video may be the same one: what counts is that another was loaded.)
  const loads = () => main.locator('[data-fake-player]').getAttribute('data-loads').then(Number);
  const advance = async act => {
    const before = await loads();
    await act();
    await page.waitForFunction(previous => {
      const player = document.querySelector('[data-fake-player]');
      const now = document.querySelector('[data-random-video="info"]')?.dataset.video;
      return Number(player?.dataset.loads) > previous && now?.startsWith('good') && player.dataset.playing === now;
    }, before);
  };
  for (let i = 0; i < 4; i++) await advance(() => main.locator('[data-random-video="next"]').click());
  await advance(() => page.evaluate(() => window.__endVideo()));
  await main.locator('[data-random-video="skipped"]').waitFor();
  assert.match(await main.locator('[data-random-video="skipped"]').innerText(), /^\d+ videos? that cannot be played here/);

  // With "play the next" off, the end of a video stays on it.
  await main.getByLabel('Play the next when it ends').uncheck();
  const stay = await loads();
  await page.evaluate(() => window.__endVideo());
  await page.waitForTimeout(300);
  assert.equal(await loads(), stay, 'no other video was loaded');
  console.log('PASS: random-video: nothing asked before a press, a video with its name and links, next and the end go on past unplayable ones, auto-next off stays');
}
