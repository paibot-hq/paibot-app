"use client";

import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";

import styles from "./ip-lookup.module.css";

import { useEffect, useState } from "react";
import { useLocale } from "use-intl";
import type { RequestInfo } from "../../lib/ip-info";
import { useTranslations } from "use-intl";

type Result = { status: "loading" | "ok" | "error"; ip: string | null };

// ipv4.icanhazip.com/ipv6.icanhazip.com only have an A/AAAA record
// respectively, so whichever one the browser can actually reach reveals that
// specific protocol's client IP. Cloudflare (which also runs paibot.app)
// operates icanhazip.com itself; see docs/plans/production-deploy.md for why
// this couldn't be self-hosted (the same settings.ipv4_only/ipv6_only DNS
// feature icanhazip.com presumably relies on isn't available on this zone's
// plan). Allowed in src/lib/security-headers.server.ts's CSP connect-src.
async function fetchIp(host: string): Promise<string | null> {
  const response = await fetch(`https://${host}`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) return null;
  const text = await response.text();
  return text.trim() || null;
}

function useProtocolIp(host: string): Result {
  const [result, setResult] = useState<Result>({ status: "loading", ip: null });
  useEffect(() => {
    let cancelled = false;
    fetchIp(host)
      .then(ip => { if (!cancelled) setResult({ status: ip ? "ok" : "error", ip }); })
      .catch(() => { if (!cancelled) setResult({ status: "error", ip: null }); });
    return () => { cancelled = true; };
  }, [host]);
  return result;
}

// What this site sees of the request (from /api/ip) and what the browser says of itself; shown to the visitor only.
function useDetails() {
  const [info, setInfo] = useState<RequestInfo | "error" | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ip", { signal: AbortSignal.timeout(5000) })
      .then(response => (response.ok ? (response.json() as Promise<RequestInfo>) : Promise.reject(new Error("failed"))))
      .then(data => { if (!cancelled) setInfo(data); })
      .catch(() => { if (!cancelled) setInfo("error"); });
    return () => { cancelled = true; };
  }, []);
  return info;
}

type Row = [label: string, value: string | null];

function Details({ rows, title }: { rows: Row[]; title: string }) {
  const shown = rows.filter((row): row is [string, string] => row[1] !== null && row[1] !== "");
  if (shown.length === 0) return null;
  return (
    <section className={styles.details}>
      <h2 className={styles.heading}>{title}</h2>
      <dl className={styles.list}>
        {shown.map(([label, value]) => <div key={label} className={styles.row}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </section>
  );
}

export default function IpLookup() {
  const t = useTranslations("App");
  const locale = useLocale();
  const details = useDetails();
  // The browser's own facts are read after the page is shown (the server cannot know them).
  const [browser, setBrowser] = useState<Row[]>([]);
  useEffect(() => {
    setBrowser([
      [t("ip.languages"), navigator.languages?.join(", ") || navigator.language],
      [t("ip.browserTimezone"), Intl.DateTimeFormat().resolvedOptions().timeZone],
      [t("ip.screen"), `${screen.width} × ${screen.height} (${t("ip.pixelRatio", { n: window.devicePixelRatio })})`],
      [t("ip.online"), navigator.onLine ? t("ip.yes") : t("ip.no")],
      [t("ip.cookies"), navigator.cookieEnabled ? t("ip.yes") : t("ip.no")],
      [t("ip.doNotTrack"), navigator.doNotTrack === "1" ? t("ip.yes") : t("ip.no")],
    ]);
  }, [t]);
  const place = (info: RequestInfo) => {
    let country = info.country;
    try { if (country) country = `${new Intl.DisplayNames([locale], { type: "region" }).of(country) ?? country} (${country})`; } catch { /* keep the code */ }
    return [country, info.region, info.city].filter(Boolean).join(" / ");
  };
  const connection: Row[] = details && details !== "error" ? [
    [t("ip.provider"), [details.organization ?? "", details.asn ? `AS${details.asn}` : ""].filter(Boolean).join(" · ")],
    [t("ip.place"), place(details)],
    [t("ip.timezone"), details.timezone],
    [t("ip.colo"), details.colo],
    [t("ip.protocol"), [details.protocol, details.tls].filter(Boolean).join(" · ")],
    [t("ip.acceptLanguage"), details.acceptLanguage],
    [t("ip.userAgent"), details.userAgent],
  ] : [];

  const v4 = useProtocolIp("ipv4.icanhazip.com");
  const v6 = useProtocolIp("ipv6.icanhazip.com");

  function renderValue(result: Result) {
    if (result.status === "loading") return "…";
    if (result.status === "error") return t("ip.unknown");
    return result.ip;
  }

  return (
    <ToolLayout title={t("ip.title")} contentWidth="auto">
      <p className={controls.label}>{t("ip.ipv4Label")}</p>
      <p className={styles["ip-value"]} aria-live="polite">{renderValue(v4)}</p>

      <p className={controls.label}>{t("ip.ipv6Label")}</p>
      <p className={styles["ip-value"]} aria-live="polite">{renderValue(v6)}</p>
      {details === "error" && <p className={controls.label} role="status">{t("ip.detailsFailed")}</p>}
      <Details rows={connection} title={t("ip.connection")} />
      <Details rows={browser} title={t("ip.browser")} />
      {details && details !== "error" && <p className={`${controls.label} ${styles.note}`}>{t("ip.note")}</p>}
    </ToolLayout>
  );
}
