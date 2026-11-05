import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/wedding/seo";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl + "/" }];
}
