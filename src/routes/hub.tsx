import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import SiteCover, { type CoverCard } from '../components/site-cover';
import { APP_CATALOG } from '../lib/app-catalog';
import { MATH_CATALOG } from '../lib/math-catalog';

// The cover of paibot.dev itself: the three sites it holds. (A page of the app for now; the bare domain will serve it.)
export default function Hub() {
  const locale = useLocale();
  const t = useTranslations('App.hub');
  const tools = APP_CATALOG.filter(app => app.status === 'published').length;
  const items = MATH_CATALOG.reduce((sum, unit) => sum + unit.items.length, 0);
  const cards: CoverCard[] = [
    { key: 'app', title: t('app.title'), text: t('app.text'), badge: t('open'), href: '/apps', meta: t('app.meta', { tools }) },
    { key: 'learn', title: t('learn.title'), text: t('learn.text'), badge: t('open'), href: '/learn', meta: t('learn.meta', { items }) },
    { key: 'doc', title: t('doc.title'), text: t('doc.text'), badge: t('soon'), href: '/doc' },
  ];
  return <>
    <PublicHead locale={locale} path="/hub" title={t('title')} description={t('description')} />
    <SiteCover eyebrow="PAIBOT LLC" heading="PAIBOT" lead={t('lead')} cardsHeading={t('sites')} cards={cards}
      stats={[{ key: 'tools', value: tools, label: t('stats.tools') }, { key: 'items', value: items, label: t('stats.items') }, { key: 'languages', value: 3, label: t('stats.languages') }]} />
  </>;
}
