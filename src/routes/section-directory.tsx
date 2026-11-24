import { useLoaderData, type LoaderFunctionArgs } from 'react-router';
import { useLocale, useTranslations } from 'use-intl';
import Card from '../components/app-card';
import PublicHead from '../components/public-head';
import SiteFooter from '../components/site-footer';
import styles from '../components/search-home.module.css';
import { Link } from '../i18n/navigation';
import { apps, type AppEntry, type DynamicT } from '../lib/apps';
import { homeSection, HOME_GROUPS } from '../lib/home-sections';
import { TOP_COUNT } from '../lib/tool-ranking';
import { getRanking } from '../lib/tool-ranking.server';
import { useFavoritesData } from './locale';

const listed = apps.filter(app => app.status === 'published' && app.href && !app.private);
const appBySlug = new Map(listed.map(app => [app.slug, app]));
const toolSlugs = new Set(HOME_GROUPS.tools.flatMap<string>(group => group.apps));

const tasks = {
  learn: [['math', '/math/arith/order-of-operations', '/math']],
  lab: [['data', '/sql']],
  tools: [['photo', '/metadata', '/mosaic'], ['writing', '/wc', '/date-calc']],
  play: [],
} as const;

export async function loader({ request }: LoaderFunctionArgs) {
  const slug = new URL(request.url).pathname.split('/')[2]?.replace(/\.data$/, '') ?? null;
  const section = homeSection(slug);
  if (!section) throw new Response('Not Found', { status: 404 });
  const popular = section === 'tools'
    ? (await getRanking()).filter(entry => toolSlugs.has(entry.slug)).slice(0, TOP_COUNT).map(entry => entry.slug)
    : [];
  return { section, popular };
}

export default function SectionDirectory() {
  const { section, popular } = useLoaderData<typeof loader>();
  const t = useTranslations('App');
  const ts = useTranslations('App.search');
  const td = t as unknown as DynamicT;
  const locale = useLocale();
  const { signedIn, favoriteSlugs } = useFavoritesData();
  const favorites = new Set(favoriteSlugs);
  const title = ts(`shelves.${section}`);
  const description = ts(`sections.${section}.description`);
  const cards = (slugs: readonly string[]) => slugs.map(slug => appBySlug.get(slug))
    .filter((app): app is AppEntry => app !== undefined)
    .map(app => <Card key={app.slug} app={app} td={td} locale={locale} signedIn={signedIn} favorited={favorites.has(app.slug)} />);

  return <>
    <PublicHead locale={locale} path={`/${section}`} title={`${title} | PAIBOT.app`} description={description} />
    <main className={`${styles.page} ${styles.all} ${styles.sectionPanel}`} data-section={section}>
      <header className={styles.directoryHeader}>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {(section === 'tools' || section === 'play') && <div className={styles.directoryOptions}>
        <nav className={styles.topicNav} aria-label={ts('directoryTopics')}>
          {HOME_GROUPS[section].map(group => <a key={group.id} href={`#topic-${group.id}`}>{ts(`topics.${group.id}`)}</a>)}
        </nav>
        {section === 'tools' && <div className={styles.directoryLinks}>
          <p className={styles.more}><Link href="/apps" data-search="all-apps">{ts('allApps', { count: listed.length })}</Link></p>
        </div>}
      </div>}
      <div className={styles.topicGroups}>
        {HOME_GROUPS[section].map(group => (
          <section key={group.id} className={styles.topicGroup} data-topic={group.id} aria-labelledby={`topic-${group.id}`}>
            <h2 id={`topic-${group.id}`}>{ts(`topics.${group.id}`)}</h2>
            {group.id === 'artificialIntelligence' ? <Link href="/ai-ds" className={styles.shelfLead}>
              <span><strong>{ts('learnAi')}</strong><small>{ts('learnAiBody')}</small></span>
              <span aria-hidden="true">→</span>
            </Link> : <ul>{cards(group.apps)}</ul>}
          </section>
        ))}
      </div>
      {popular.length > 0 && <section data-search="popular">
        <h2>{ts('popularTools')}</h2>
        <ol className={styles.ranked}>{cards(popular)}</ol>
        <p className={styles.more}><Link href="/ranking">{ts('ranking')}</Link></p>
      </section>}
      {tasks[section].length > 0 && <details key={section} className={styles.taskGuide} data-search="start">
        <summary>{ts('startTitle')}</summary>
        <div className={styles.tasks}>
          {tasks[section].map(([key, first, second]) => <article key={key} className={styles.task}>
            <h3>{ts(`tasks.${key}.title`)}</h3>
            <p>{ts(`tasks.${key}.body`)}</p>
            <div className={styles.taskLinks}>
              <Link href={first}>{ts(`tasks.${key}.firstLink`)} →</Link>
              {second && <Link href={second}>{ts(`tasks.${key}.secondLink`)} →</Link>}
            </div>
            <ol>{(['first', 'second'] as const).map(step => <li key={step}>{ts(`tasks.${key}.${step}`)}</li>)}</ol>
          </article>)}
        </div>
      </details>}
    </main>
    <SiteFooter year={new Date().getFullYear()} />
  </>;
}
