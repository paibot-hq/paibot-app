import { Link } from "../i18n/navigation";
import type { AppEntry, DynamicT } from "../lib/apps";
import FavoriteButton from "./favorite-button";
// The card's look is in the top page's styles (under .all), shared by the list of every app (/apps).
import styles from "./search-home.module.css";

// A card: the app's link, and the favourite star beside it (a button cannot sit inside a link). A component of its own, not
// one made inside a page: that would be a new component on every render, and React would rebuild every card.
export default function Card({ app, td, locale, signedIn, favorited }: { app: AppEntry; td: DynamicT; locale: string; signedIn: boolean; favorited: boolean }) {
  return (
    <li className="app-card-wrap" data-tag={app.tags[0]} data-local={app.localOnly || undefined}>
      <Link href={app.href!}>
        <app.icon aria-hidden="true" />
        <span className={styles.name}>
          <span className={styles.titleRow}>
            <span>{td(`${app.messageKey}.title`)}</span>
            {app.localOnly && <span className={styles.localBadge}>{td("apps.localBadge")}</span>}
          </span>
          <span className={styles.about}>{td(`${app.messageKey}.description`)}</span>
        </span>
      </Link>
      <FavoriteButton actionPath={`/${locale}/favorites`} slug={app.slug} signedIn={signedIn} favorited={favorited} addLabel={td("apps.favorite")} removeLabel={td("apps.unfavorite")} />
    </li>
  );
}
