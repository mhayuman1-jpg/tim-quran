import type { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { getBaseUrl } from '@/lib/url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const supabase = createServerClient();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/profil`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/program`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/artikel`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/pengumuman`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/galeri`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  const { data: artikels } = await supabase
    .from('artikel')
    .select('slug, updated_at, published_at')
    .eq('is_published', true);

  const artikelPages: MetadataRoute.Sitemap = (artikels ?? []).map((a) => ({
    url: `${baseUrl}/artikel/${a.slug}`,
    lastModified: new Date(a.updated_at ?? a.published_at ?? new Date()),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...artikelPages];
}
