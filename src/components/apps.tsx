"use client";

import { useTranslations } from "next-intl";
import { Link } from "../i18n/navigation";

export default function Apps({ year }: { year: number }) {
  const t = useTranslations("App");
  return (
    <>
    <main className="section">
      <div className="section-head">
        <p className="eyebrow">{t("appsEyebrow")}</p>
        <h1>{t("appsTitle")}</h1>
      </div>

      <div className="app-grid">
        <Link className="app-card" href="/ip">
          <span className="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8 15.5a6 6 0 0 1 8 0" />
              <path d="M4.5 12a11 11 0 0 1 15 0" />
              <path d="M12 19h.01" />
            </svg>
          </span>
          <div>
            <p className="app-kicker">{t("ipKicker")}</p>
            <h3>{t("ipTitle")}</h3>
            <p>{t("ipDescription")}</p>
          </div>
        </Link>
        <Link className="app-card" href="/wc">
          <span className="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </span>
          <div>
            <p className="app-kicker">{t("wcKicker")}</p>
            <h3>{t("wcTitle")}</h3>
            <p>{t("wcDescription")}</p>
          </div>
        </Link>
        <Link className="app-card" href="/arith">
          <span className="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <path d="M8 7h8" />
              <path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
            </svg>
          </span>
          <div>
            <p className="app-kicker">{t("arithKicker")}</p>
            <h3>{t("arithTitle")}</h3>
            <p>{t("arithDescription")}</p>
          </div>
        </Link>
        <Link className="app-card" href="/age">
          <span className="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="4" y="5" width="16" height="15" rx="2" />
              <path d="M4 9h16M8 3v4M16 3v4" />
            </svg>
          </span>
          <div>
            <p className="app-kicker">{t("ageKicker")}</p>
            <h3>{t("ageTitle")}</h3>
            <p>{t("ageDescription")}</p>
          </div>
        </Link>
        <Link className="app-card" href="/password">
          <span className="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <div>
            <p className="app-kicker">{t("passwordKicker")}</p>
            <h3>{t("passwordTitle")}</h3>
            <p>{t("passwordDescription")}</p>
          </div>
        </Link>
        <Link className="app-card" href="/base64">
          <span className="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 7h13l-3-3" />
              <path d="M20 17H7l3 3" />
            </svg>
          </span>
          <div>
            <p className="app-kicker">{t("base64Kicker")}</p>
            <h3>{t("base64Title")}</h3>
            <p>{t("base64Description")}</p>
          </div>
        </Link>
        <Link className="app-card" href="/urlencode">
          <span className="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="7" cy="7" r="2.2" />
              <circle cx="17" cy="17" r="2.2" />
              <path d="M17 7 7 17" />
            </svg>
          </span>
          <div>
            <p className="app-kicker">{t("urlencodeKicker")}</p>
            <h3>{t("urlencodeTitle")}</h3>
            <p>{t("urlencodeDescription")}</p>
          </div>
        </Link>
        <Link className="app-card" href="/dice">
          <span className="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" />
            </svg>
          </span>
          <div>
            <p className="app-kicker">{t("diceKicker")}</p>
            <h3>{t("diceTitle")}</h3>
            <p>{t("diceDescription")}</p>
          </div>
        </Link>
        <Link className="app-card" href="/reaction">
          <span className="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" />
            </svg>
          </span>
          <div>
            <p className="app-kicker">{t("reactionKicker")}</p>
            <h3>{t("reactionTitle")}</h3>
            <p>{t("reactionDescription")}</p>
          </div>
        </Link>
        <Link className="app-card" href="/timing">
          <span className="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l3 2" />
              <path d="M9 3h6" />
            </svg>
          </span>
          <div>
            <p className="app-kicker">{t("timingKicker")}</p>
            <h3>{t("timingTitle")}</h3>
            <p>{t("timingDescription")}</p>
          </div>
        </Link>
        <Link className="app-card muted" href="/math">
          <span className="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 20 20 20" />
              <path d="M4 20 4 4" />
              <path d="M5 18 Q12 5 19 18" />
            </svg>
          </span>
          <div>
            <p className="app-kicker">{t("mathKicker")}</p>
            <h3>{t("mathTitle")}</h3>
            <p>{t("mathDescription")}</p>
          </div>
        </Link>
      </div>
    </main>

    <footer>
      <span>PAIBOT.app</span>
      <span>&copy; <span>{year}</span> PAIBOT LLC.</span>
    </footer>
    </>
  );
}
