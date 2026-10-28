// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('circle');
  const board = main.locator('[data-circle="board"]');
  const box = await board.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2, r = box.width * 0.35;
  const stroke = async (turns, wobble = 0) => {
    const at = i => {
      const a = (2 * Math.PI * turns * i) / 90;
      const rr = r * (1 + wobble * Math.sin(5 * a));
      return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
    };
    await page.mouse.move(...at(0));
    await page.mouse.down();
    for (let i = 1; i <= 90; i++) await page.mouse.move(...at(i));
    await page.mouse.up();
  };

  // A round stroke scores high and is kept as the best, with a way to share it.
  await stroke(1.02);
  const score = Number(await main.locator('[data-circle="score"]').innerText());
  assert.ok(score >= 95, `a round stroke scores high: ${score}`);
  assert.equal(Number(await main.locator('[data-circle="best"]').innerText()), score);
  const x = new URL(await main.locator('[data-share] [data-network="x"]').getAttribute('href'));
  assert.match(x.searchParams.get('text'), /\d/);
  assert.match(x.searchParams.get('url'), /\/en\/circle$/);

  // A wobbly one scores lower and leaves the best as it was.
  await stroke(1.02, 0.08);
  const worse = Number(await main.locator('[data-circle="score"]').innerText());
  assert.ok(worse < score - 10, `a wobbly stroke scores lower: ${worse}`);
  assert.equal(Number(await main.locator('[data-circle="best"]').innerText()), score);

  // Half a circle is not judged; it says why.
  await stroke(0.5);
  await main.locator('[data-circle="problem"]').waitFor();
  assert.equal(await main.locator('[data-circle="score"]').count(), 0);

  await main.getByRole('button', { name: 'Clear', exact: true }).click();
  assert.equal(await main.locator('[data-circle="problem"]').count(), 0);
  console.log('PASS: circle: a round stroke scores high and is kept, a wobbly one lower, half a circle is not judged, clear');
}
