import type { ProfilExportData } from '@/lib/raport/fetch-raport-data';

const IMAGE_FETCH_TIMEOUT_MS = 8000;
const PRINT_LOGO_MAX_PX = 180;

function getResizedFetchUrl(url: string): string {
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    const renderUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    return `${renderUrl}?width=${PRINT_LOGO_MAX_PX}&height=${PRINT_LOGO_MAX_PX}&resize=contain`;
  }
  return url;
}

function detectMime(url: string, buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
  if (url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg')) return 'image/jpeg';
  if (url.toLowerCase().includes('.webp')) return 'image/webp';
  return 'image/png';
}

async function fetchImageBuffer(url?: string | null): Promise<Buffer | null> {
  if (!url || url.startsWith('data:')) return null;

  const fetchUrl = getResizedFetchUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(fetchUrl, { signal: controller.signal });
    if (!res.ok && fetchUrl !== url) {
      const fallback = await fetch(url, { signal: controller.signal });
      if (!fallback.ok) return null;
      return Buffer.from(await fallback.arrayBuffer());
    }
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function urlToDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  const buffer = await fetchImageBuffer(url);
  if (!buffer) return null;

  const mime = detectMime(url, buffer);
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/** Embed logo URLs as inline data URLs so Playwright PDF tidak perlu fetch eksternal. */
export async function embedProfilLogos(
  profil: ProfilExportData | null,
): Promise<ProfilExportData | null> {
  if (!profil) return null;

  const originalSekolah = profil.logo_sekolah_url;
  const originalTim = profil.logo_url;

  const [logoSekolah, logoTim] = await Promise.all([
    urlToDataUrl(originalSekolah),
    urlToDataUrl(originalTim),
  ]);

  return {
    ...profil,
    logo_sekolah_url: logoSekolah ?? originalSekolah,
    logo_url: logoTim ?? originalTim,
  };
}

export interface LogoReplacement {
  from: string;
  to: string;
}

/** Kumpulkan pasangan URL asli → data URL untuk html_custom. */
export async function buildLogoReplacements(
  profil: ProfilExportData | null,
): Promise<{ profil: ProfilExportData | null; replacements: LogoReplacement[] }> {
  if (!profil) return { profil: null, replacements: [] };

  const entries: { from?: string | null; to?: string | null }[] = [
    { from: profil.logo_sekolah_url, to: await urlToDataUrl(profil.logo_sekolah_url) },
    { from: profil.logo_url, to: await urlToDataUrl(profil.logo_url) },
  ];

  const replacements: LogoReplacement[] = [];
  const nextProfil = { ...profil };

  for (const { from, to } of entries) {
    if (!from || !to?.startsWith('data:')) continue;
    replacements.push({ from, to });
    if (from === profil.logo_sekolah_url) nextProfil.logo_sekolah_url = to;
    if (from === profil.logo_url) nextProfil.logo_url = to;
  }

  return { profil: nextProfil, replacements };
}

/** Ganti src logo eksternal di html_custom dengan data URL yang sudah di-embed. */
export function embedLogosInHtml(html: string, replacements: LogoReplacement[]): string {
  let result = html;
  for (const { from, to } of replacements) {
    if (!from || !to.startsWith('data:')) continue;
    result = result.split(from).join(to);
  }
  return result;
}
