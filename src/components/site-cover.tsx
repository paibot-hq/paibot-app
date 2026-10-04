import type { ComponentType, SVGProps } from 'react';
import { Link } from '../i18n/navigation';
import SiteFooter from './site-footer';
import styles from './site-cover.module.css';

export type CoverCard = { key: string; title: string; text: string; badge: string; href?: string; meta?: string; tags?: readonly string[]; icon?: ComponentType<SVGProps<SVGSVGElement>> };

// The hero at the top of a site's cover: a card, or (the hub only) the clouds and the mascot. A CTA starting with
// "#" is a link inside the page.
export function CoverHero({ eyebrow, heading, lead, cta, ctaHref, mascot }: { eyebrow: string; heading: string; lead: string; cta?: string; ctaHref?: string; mascot?: boolean }) {
  const button = cta && ctaHref && (ctaHref.startsWith('#') ? <a className="auth-link" href={ctaHref}>{cta}</a> : <Link className="auth-link" href={ctaHref}>{cta}</Link>);
  if (mascot) return <section className="hero" aria-labelledby="cover-title">
    <div className="cloud-field" aria-hidden="true">
      <span className="cloud cloud-a"></span>
      <span className="cloud cloud-b"></span>
      <span className="cloud cloud-c"></span>
    </div>
    <div className="hero-copy">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="cover-title"><span className="wordmark">{heading}</span></h1>
      <p className="lead">{lead}</p>
      {button}
    </div>
    <div className="hero-mascot" aria-hidden="true">
      <span className="hero-mascot-eye"></span>
      <span className="hero-mascot-eye"></span>
    </div>
  </section>;
  return <section className={styles.hero} aria-labelledby="cover-title">
    <p className={styles.eyebrow}>{eyebrow}</p>
    <h1 id="cover-title">{heading}</h1>
    <p className={styles.lead}>{lead}</p>
    {button}
  </section>;
}

// The cover of one of PAIBOT's sites (learn, doc, the hub): a hero, optional big numbers, and cards for what is in it.
// A card without `href` is not open yet and is drawn faded.
export default function SiteCover({ eyebrow, heading, lead, cta, ctaHref, mascot, stats, cardsHeading, cards }: {
  eyebrow: string; heading: string; lead: string; cta?: string; ctaHref?: string;
  // The hub's hero (clouds and the mascot) instead of the card.
  mascot?: boolean;
  stats?: readonly { key: string; value: number | string; label: string }[];
  cardsHeading: string; cards: readonly CoverCard[];
}) {
  return <>
    <main className={styles.page}>
      <CoverHero eyebrow={eyebrow} heading={heading} lead={lead} cta={cta} ctaHref={ctaHref} mascot={mascot} />
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
    <span className={styles.cardTitle}><span className={styles.titleText}>{card.icon && <span className={styles.cardIcon} aria-hidden="true"><card.icon /></span>}{card.title}</span><span className={styles.badge}>{card.badge}</span></span>
    <span className={styles.cardText}>{card.text}</span>
    {card.meta && <span className={styles.cardMeta}>{card.meta}</span>}
    {card.tags && <span className={styles.tags}>{card.tags.map(tag => <span key={tag}>{tag}</span>)}</span>}
  </>;
}
