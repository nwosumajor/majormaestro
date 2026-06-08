import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com";
  const now = new Date();
  const paths: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/assessment", priority: 0.7, changeFrequency: "monthly" },
    { path: "/roadmap", priority: 0.7, changeFrequency: "monthly" },
    { path: "/recovery", priority: 0.9, changeFrequency: "weekly" },
    { path: "/recovery/trade-finance", priority: 0.6, changeFrequency: "monthly" },
    { path: "/recovery/banking", priority: 0.6, changeFrequency: "monthly" },
    { path: "/recovery/fmcg", priority: 0.6, changeFrequency: "monthly" },
    { path: "/recovery/manufacturing", priority: 0.6, changeFrequency: "monthly" },
    { path: "/recovery/refer", priority: 0.5, changeFrequency: "monthly" },
  ];

  return paths.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
