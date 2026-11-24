declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, params?: Record<string, string>) => void;
  }
}

export type AnalyticsEventParams = Record<string, string>;
export type AnalyticsSender = (name: string, params: AnalyticsEventParams) => void;
export type LabAction = 'step' | 'play';
export type LabSettingChange = 'initial' | 'rate' | 'preset';
export type LabLessonTarget = 'math' | 'ai-ds' | 'approx';

export function sendAnalyticsEvent(name: string, params: AnalyticsEventParams): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

// Tracks one lab view's funnel without sending input values, study history, or user IDs.
// Deduplicates per view so GA4 counts match:
// - first interaction rate = lab_first_interact / lab_view
// - retry rate = lab_retry / lab_first_interact
export function createLabAnalytics(labId: string, send: AnalyticsSender = sendAnalyticsEvent) {
  let viewed = false;
  let interacted = false;
  let changedSinceInteract: LabSettingChange | null = null;
  let retried = false;
  const clickedLessons = new Set<LabLessonTarget>();

  return {
    view() {
      if (viewed) return;
      viewed = true;
      send('lab_view', { lab_id: labId });
    },
    changeSetting(kind: LabSettingChange) {
      if (interacted && !retried) changedSinceInteract = kind;
    },
    interact(action: LabAction) {
      if (!interacted) {
        interacted = true;
        changedSinceInteract = null;
        send('lab_first_interact', { lab_id: labId, action });
        return;
      }
      if (!retried && changedSinceInteract) {
        const changed = changedSinceInteract;
        retried = true;
        changedSinceInteract = null;
        send('lab_retry', { lab_id: labId, action, changed });
      }
    },
    lessonClick(target: LabLessonTarget) {
      if (clickedLessons.has(target)) return;
      clickedLessons.add(target);
      send('lab_lesson_click', { lab_id: labId, target });
    },
  };
}
