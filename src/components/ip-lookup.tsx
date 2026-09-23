"use client";

import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

import styles from "./ip-lookup.module.css";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Result = { status: "loading" | "ok" | "error"; ip: string | null };

// ipv4.icanhazip.com/ipv6.icanhazip.com only have an A/AAAA record
// respectively, so whichever one the browser can actually reach reveals that
// specific protocol's client IP. Cloudflare (which also runs paibot.app)
// operates icanhazip.com itself; see docs/plans/production-deploy.md for why
// this couldn't be self-hosted (the same settings.ipv4_only/ipv6_only DNS
// feature icanhazip.com presumably relies on isn't available on this zone's
// plan). Allowed in src/proxy.ts's CSP connect-src.
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

export default function IpLookup() {
  const t = useTranslations("App");
  const v4 = useProtocolIp("ipv4.icanhazip.com");
  const v6 = useProtocolIp("ipv6.icanhazip.com");

  function renderValue(result: Result) {
    if (result.status === "loading") return "…";
    if (result.status === "error") return t("ip.unknown");
    return result.ip;
  }

  return (
    <ToolLayout title={t("ip.title")} layout="centered" contentWidth="auto">
      <p className={controls.label}>{t("ip.ipv4Label")}</p>
      <p className={styles["ip-value"]} aria-live="polite">{renderValue(v4)}</p>

      <p className={controls.label}>{t("ip.ipv6Label")}</p>
      <p className={styles["ip-value"]} aria-live="polite">{renderValue(v6)}</p>
      </ToolLayout>
  );
}
