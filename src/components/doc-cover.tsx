import { useLocale, useTranslations } from 'use-intl';
import PublicHead from './public-head';
import SiteCover, { type CoverCard } from './site-cover';

// A design of the cover for the documentation site (doc.paibot.dev), which will be its own static site and is shown
// here only on the doc host (doc.localhost); the topics are planned articles, not published ones.
const TOPICS = ['generation', 'column', 'edge'] as const;

export default function DocCover() {
  const locale = useLocale();
  const t = useTranslations('App.doc');
  const cards: CoverCard[] = TOPICS.map(key => ({ key, title: t(`topics.${key}.title`), text: t(`topics.${key}.text`), badge: t('planned'), tags: [t(`topics.${key}.tag`)] }));
  return <>
    <PublicHead locale={locale} path="" title={t('title')} description={t('description')} />
    <SiteCover eyebrow="PAIBOT" heading={t('heading')} lead={t('lead')} cardsHeading={t('topicsHeading')} cards={cards} />
  </>;
}
