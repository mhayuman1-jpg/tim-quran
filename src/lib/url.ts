// src/lib/url.ts — Shared base URL helper (Vercel & Netlify compatible)

export function getBaseUrl(): string {
  // Netlify: URL env variable
  if (process.env.URL) return process.env.URL;
  // Vercel: VERCEL_URL env variable
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Custom domain
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return 'http://localhost:3000';
}
