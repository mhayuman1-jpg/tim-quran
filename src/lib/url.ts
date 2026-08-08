// src/lib/url.ts — Shared base URL helper (Vercel, Netlify, & Cloudflare compatible)

export function getBaseUrl(): string {
  // Vercel: VERCEL_URL env variable (akan di-deprecate, tapi masih work)
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Netlify: URL env variable
  if (process.env.URL) return process.env.URL;
  // Custom domain
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return 'http://localhost:3000';
}
