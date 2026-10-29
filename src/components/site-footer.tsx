import { useTranslations } from 'use-intl';
import { Link } from '../i18n/navigation';

// Shared by the pages that end with a footer (home, app list, about,
// the plan page and the legal pages). Links
// the plan page and the legal pages a payment provider reviews.
export default function SiteFooter({ year }: { year: number }) {
  const t = useTranslations('App.footer');
  return <footer>
    <span>PAIBOT.app</span>
    <nav className="footer-links" aria-label={t('label')}>
      <Link href="/apps">{t('apps')}</Link>
      <Link href="/about">{t('about')}</Link>
      <Link href="/ranking">{t('ranking')}</Link>
      <Link href="/supporter">{t('supporter')}</Link>
      <Link href="/legal/terms">{t('terms')}</Link>
      <Link href="/legal/privacy">{t('privacy')}</Link>
      <Link href="/legal/commerce">{t('commerce')}</Link>
    </nav>
    <span>&copy; <span>{year}</span> PAIBOT LLC.</span>
  </footer>;
}
