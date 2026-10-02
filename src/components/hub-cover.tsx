import { useLocale, useTranslations } from 'use-intl';
import PublicHead from './public-head';
import SiteCover, { type CoverCard } from './site-cover';
import { useSiteMeta } from '../root';
import { APP_CATALOG } from '../lib/app-catalog';
import { MATH_CATALOG } from '../lib/math-catalog';

// The cover of paibot.dev itself (and of localhost): the three sites it holds.
export default function HubCover() {
  const locale = useLocale();
  const { origins } = useSiteMeta();
  const t = useTranslations('App.hub');
  const tools = APP_CATALOG.filter(app => app.status === 'published').length;
  const items = MATH_CATALOG.reduce((sum, unit) => sum + unit.items.length, 0);
  const cards: CoverCard[] = [
    { key: 'app', title: t('app.title'), text: t('app.text'), badge: t('open'), href: `${origins.app}/${locale}`, meta: t('app.meta', { tools }) },
    { key: 'learn', title: t('learn.title'), text: t('learn.text'), badge: t('open'), href: `${origins.learn}/${locale}`, meta: t('learn.meta', { items }) },
    { key: 'network', title: t('network.title'), text: t('network.text'), badge: t('open'), href: `${origins.network}/${locale}` },
    { key: 'doc', title: t('doc.title'), text: t('doc.text'), badge: t('soon'), href: `${origins.doc}/${locale}` },
  ];
  return <>
    <PublicHead locale={locale} path="" title={t('title')} description={t('description')} />
    <SiteCover eyebrow="PAIBOT LLC" heading="PAIBOT" lead={t('lead')} cardsHeading={t('sites')} cards={cards}
      stats={[{ key: 'tools', value: tools, label: t('stats.tools') }, { key: 'items', value: items, label: t('stats.items') }, { key: 'languages', value: 3, label: t('stats.languages') }]} />
  </>;
}
