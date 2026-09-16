import type { MetadataRoute } from "next";
import { siteOrigin, isIndexable } from "../lib/seo";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return isIndexable
    ? { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/__clerk/"] }, sitemap: `${siteOrigin}/sitemap.xml` }
    : { rules: { userAgent: "*", disallow: "/" } };
}
