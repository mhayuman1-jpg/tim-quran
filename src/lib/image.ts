export function cacheBust(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = String(url);
    const separator = u.includes('?') ? '&' : '?';
    return `${u}${separator}t=${Math.floor(Date.now() / 60000)}`;
  } catch {
    return url;
  }
}
