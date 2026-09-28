import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import SiteFooter from '../components/site-footer';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import { SUPPORTER_PLAN } from '../lib/plans';
import styles from './supporter.module.css';

// The plan page: what the Supporter plan costs and gives, shown before sign-up
// (Specified Commercial Transactions Act). Sign-up opens with Stripe checkout.
export default function Supporter() {
  const locale = useLocale();
  const t = useTranslations('App.supporter');
  const price = t('price', { price: SUPPORTER_PLAN.priceYen.toLocaleString(locale) });
  return <><PublicHead locale={locale} path="/supporter" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} centerTitle>
      <div className={styles.plan}>
        <p className={styles.lead}>{t('lead')}</p>
        <section className={styles.card} aria-labelledby="supporter-plan">
          <h2 id="supporter-plan">{t('planName')}</h2>
          <p className={styles.price} data-plan-price>{price}</p>
          <ul className={styles.perks}>
            <li>{t('perkEarlyFeatures')}</li>
            <li>{t('perkHigherLimits')}</li>
            <li>{t('perkExclusiveFeatures')}</li>
          </ul>
          <ul className={styles.terms}>
            <li>{t('autoRenew')}</li>
            <li>{t('cancel')}</li>
            <li>{t('refund')}</li>
          </ul>
          <button type="button" className={styles.signUp} disabled={!SUPPORTER_PLAN.checkoutAvailable}>
            {SUPPORTER_PLAN.checkoutAvailable ? t('signUp') : t('signUpComingSoon')}
          </button>
        </section>
        <p className={styles.legal}>
          {t('legalLead')}{' '}
          <Link href="/legal/commerce">{t('legalCommerce')}</Link>{' / '}
          <Link href="/legal/terms">{t('legalTerms')}</Link>{' / '}
          <Link href="/legal/privacy">{t('legalPrivacy')}</Link>
        </p>
      </div>
    </ToolLayout>
    <SiteFooter year={new Date().getFullYear()} />
  </>;
}
