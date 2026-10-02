import { useLocale, useTranslations } from 'use-intl';
import PublicHead from './public-head';
import SiteCover, { type CoverCard } from './site-cover';
import { APP_CATALOG } from '../lib/app-catalog';

// The cover of the tools site: the developer tools, network ones first, and the monitoring they lead to (not built yet).
export default function ToolsCover() {
  const locale = useLocale();
  const t = useTranslations('App');
  const tn = useTranslations('App.toolsSite');
  const order = ['network', 'dev'];
  const tools = APP_CATALOG.filter(app => order.includes(app.category) && app.status === 'published' && app.href).sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
  const cards: CoverCard[] = [
    ...tools.map(app => ({ key: app.slug, title: t(`${app.messageKey}.title`), text: t(`${app.messageKey}.description`), badge: tn('free'), href: app.href! })),
    { key: 'monitor', title: tn('monitor.title'), text: tn('monitor.text'), badge: tn('soon') },
  ];
  return <>
    <PublicHead locale={locale} path="" title={tn('title')} description={tn('description')} />
    <SiteCover eyebrow="PAIBOT" heading={tn('heading')} lead={tn('lead')} cardsHeading={tn('tools')} cards={cards} />
  </>;
}
