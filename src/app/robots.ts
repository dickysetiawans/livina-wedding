import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/wedding/seo";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/dashboard",
        "/profile",
        "/signin",
        "/signup",
      ],
    },
    sitemap: siteUrl + "/sitemap.xml",
  };
}
