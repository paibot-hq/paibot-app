import { Link } from '../i18n/navigation';
import SiteFooter from './site-footer';
import styles from './site-cover.module.css';

export type CoverCard = { key: string; title: string; text: string; badge: string; href?: string; meta?: string; tags?: readonly string[] };

// The cover of one of PAIBOT's sites (learn, doc, the hub): a hero, optional big numbers, and cards for what is in it.
// A card without `href` is not open yet and is drawn faded.
export default function SiteCover({ eyebrow, heading, lead, cta, ctaHref, stats, cardsHeading, cards }: {
  eyebrow: string; heading: string; lead: string; cta?: string; ctaHref?: string;
  stats?: readonly { key: string; value: number | string; label: string }[];
  cardsHeading: string; cards: readonly CoverCard[];
}) {
  return <>
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="cover-title">
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 id="cover-title">{heading}</h1>
        <p className={styles.lead}>{lead}</p>
        {cta && ctaHref && <Link className="auth-link" href={ctaHref}>{cta}</Link>}
      </section>
      {stats && <dl className={styles.stats} data-count={stats.length}>
        {stats.map(({ key, value, label }) => <div key={key}><dd>{value}</dd><dt>{label}</dt></div>)}
      </dl>}
      <h2 className={styles.heading}>{cardsHeading}</h2>
      <ul className={styles.cards} data-count={cards.length}>
        {cards.map(card => <li key={card.key}>
          {card.href
            ? <Link className={styles.card} data-ready href={card.href}><CardBody card={card} /></Link>
            : <div className={styles.card}><CardBody card={card} /></div>}
        </li>)}
      </ul>
    </main>
    <SiteFooter year={new Date().getFullYear()} />
  </>;
}

function CardBody({ card }: { card: CoverCard }) {
  return <>
    <span className={styles.cardTitle}>{card.title}<span className={styles.badge}>{card.badge}</span></span>
    <span className={styles.cardText}>{card.text}</span>
    {card.meta && <span className={styles.cardMeta}>{card.meta}</span>}
    {card.tags && <span className={styles.tags}>{card.tags.map(tag => <span key={tag}>{tag}</span>)}</span>}
  </>;
}
