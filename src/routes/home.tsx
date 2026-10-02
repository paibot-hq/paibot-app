import Cover from '../components/cover';
import DocCover from '../components/doc-cover';
import HubCover from '../components/hub-cover';
import LearnCover from '../components/learn-cover';
import ToolsCover from '../components/tools-cover';
import PublicHead from '../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
import { useSiteMeta } from '../root';

// The cover of whichever site the host name is for (src/lib/sites.ts): the hub, the learning site, or the app.
export default function Home() {
  const t = useTranslations('App');
  const locale = useLocale();
  const { site } = useSiteMeta();
  if (site === 'hub') return <HubCover />;
  if (site === 'learn') return <LearnCover />;
  if (site === 'tools') return <ToolsCover />;
  if (site === 'doc') return <DocCover />;
  return <><PublicHead locale={locale} path="" title={t('title')} description={t('description')} /><Cover year={new Date().getFullYear()} /></>;
}
