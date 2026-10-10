import { useEffect, useState } from 'react';
import { useTranslations } from 'use-intl';
import styles from './share-buttons.module.css';

// Sharing a result on social networks: X and LINE get the words and the link, Facebook the link only (it takes no text), "Copy" puts both
// on the clipboard, and "More" opens the device's own share sheet where there is one (phones). Each network's page opens in a new tab.
// `path` is the page to link to, with its locale ("/ja/puchi"); the site's address is added in the browser, so a result shown by the server
// renders too.
export default function ShareButtons({ text, path }: { text: string; path: string }) {
  const t = useTranslations('App.shareButtons');
  const [native, setNative] = useState(false);
  const [origin, setOrigin] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => { setNative(typeof navigator.share === 'function'); setOrigin(window.location.origin); }, []);
  const url = `${origin}${path}`;
  const both = `${text}\n${url}`;
  const networks = [
    { id: 'x', label: 'X', href: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
    { id: 'line', label: 'LINE', href: `https://line.me/R/share?text=${encodeURIComponent(both)}` },
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  ];
  async function copy() {
    try { await navigator.clipboard.writeText(both); setStatus(t('copied')); } catch { setStatus(t('copyFailed')); }
  }
  async function more() {
    try { await navigator.share({ text, url }); } catch { /* the share sheet was closed */ }
  }
  return <div className={styles.share} data-share>
    <p className={styles.heading}>{t('heading')}</p>
    <ul className={styles.buttons}>
      {networks.map(network => <li key={network.id}>
        <a href={network.href} target="_blank" rel="noopener noreferrer" className={styles.button} data-network={network.id} aria-label={t('on', { network: network.label })}>{network.label}</a>
      </li>)}
      <li><button type="button" className={styles.button} onClick={copy} data-network="copy">{t('copy')}</button></li>
      {native && <li><button type="button" className={styles.button} onClick={more} data-network="more">{t('more')}</button></li>}
    </ul>
    <p className={styles.status} role="status">{status}</p>
  </div>;
}
