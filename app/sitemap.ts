import type { MetadataRoute } from "next";
import { siteConfig } from "@/site.config";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteConfig.url, changeFrequency: "monthly", priority: 1 }];
}
