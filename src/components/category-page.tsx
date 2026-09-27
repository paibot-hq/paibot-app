import { useLocale, useTranslations } from 'use-intl';
import Apps from './apps';
import PublicHead from './public-head';
import type { AppCategory, DynamicT } from '../lib/apps';
import { useFavoritesData } from '../routes/locale';

export default function CategoryPage({ category }: { category: AppCategory }) {
  const locale = useLocale();
  const t = useTranslations('App') as unknown as DynamicT;
  const { signedIn, favoriteSlugs } = useFavoritesData();
  return <>
    <PublicHead locale={locale} path={`/${category}`} title={`${t(`categories.${category}`)} | PAIBOT.app`} description={t(`home.${category}.description`)} />
    <Apps key={category} category={category} year={new Date().getFullYear()} signedIn={signedIn} favoriteSlugs={favoriteSlugs} />
  </>;
}
