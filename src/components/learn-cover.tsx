import { useLocale, useTranslations } from 'use-intl';
import PublicHead from './public-head';
import SiteCover, { type CoverCard } from './site-cover';
import { MATH_CATALOG, MATH_STAGES } from '../lib/math-catalog';

const ITEMS = MATH_CATALOG.reduce((sum, unit) => sum + unit.items.length, 0);

// The cover of the learning site: its subjects, and how much there is to learn in each. Only math is open so far.
export default function LearnCover() {
  const locale = useLocale();
  const t = useTranslations('App.learn');
  const cards: CoverCard[] = [
    { key: 'math', title: t('subject.math.title'), text: t('subject.math.text'), badge: t('open'), href: '/math', meta: t('mathMeta', { units: MATH_CATALOG.length, items: ITEMS }), tags: MATH_STAGES.map(stage => t(`stage.${stage}`)) },
    { key: 'english', title: t('subject.english.title'), text: t('subject.english.text'), badge: t('soon') },
    { key: 'it', title: t('subject.it.title'), text: t('subject.it.text'), badge: t('soon') },
  ];
  const stats = [
    { key: 'subjects', value: 1, label: t('stats.subjects') },
    { key: 'units', value: MATH_CATALOG.length, label: t('stats.units') },
    { key: 'items', value: ITEMS, label: t('stats.items') },
    { key: 'languages', value: 3, label: t('stats.languages') },
  ];
  return <>
    <PublicHead locale={locale} path="" title={t('title')} description={t('description')} />
    <SiteCover eyebrow="PAIBOT" heading={t('heading')} lead={t('lead')} cta={t('start')} ctaHref="/math" stats={stats} cardsHeading={t('subjects')} cards={cards} />
  </>;
}
