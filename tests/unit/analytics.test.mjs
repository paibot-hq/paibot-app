import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLabAnalytics, sendAnalyticsEvent } from '../../src/lib/analytics.ts';

test('lab analytics emits view, first interaction, retry after setting change, and lesson click once each', () => {
  const events = [];
  const lab = createLabAnalytics('gradient-descent', (name, params) => events.push({ name, params }));

  // Repeated mount/effect calls in the same view only emit lab_view once.
  lab.view();
  lab.view();

  // Changing settings before the first run does not count as a retry.
  lab.changeSetting('initial');
  lab.interact('step');
  // Running again without changing settings does not count as a retry.
  lab.interact('step');
  lab.interact('play');

  // Changing a setting after first interaction and running again emits lab_retry once.
  lab.changeSetting('preset');
  lab.interact('play');
  lab.changeSetting('rate');
  lab.interact('step');

  // Lesson link clicks are deduplicated per target in the same view.
  lab.lessonClick('math');
  lab.lessonClick('math');
  lab.lessonClick('ai-ds');
  lab.lessonClick('approx');

  assert.deepEqual(events, [
    { name: 'lab_view', params: { lab_id: 'gradient-descent' } },
    { name: 'lab_first_interact', params: { lab_id: 'gradient-descent', action: 'step' } },
    { name: 'lab_retry', params: { lab_id: 'gradient-descent', action: 'play', changed: 'preset' } },
    { name: 'lab_lesson_click', params: { lab_id: 'gradient-descent', target: 'math' } },
    { name: 'lab_lesson_click', params: { lab_id: 'gradient-descent', target: 'ai-ds' } },
    { name: 'lab_lesson_click', params: { lab_id: 'gradient-descent', target: 'approx' } },
  ]);
});

test('sendAnalyticsEvent is a no-op outside the browser or when gtag is absent', () => {
  assert.doesNotThrow(() => sendAnalyticsEvent('lab_view', { lab_id: 'gradient-descent' }));
});
