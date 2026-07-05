// src/app/layout.tsx — Enhanced for PWA & Mobile
import type { Metadata } from "next";
import { Outfit, Amiri } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { SessionProvider } from "./providers";
import "./globals.css";
import { SWRProvider } from "./swr-provider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return 'http://localhost:3000';
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "Tim Qur'an — Sistem Manajemen Tahfidz & Tahsin",
    template: "%s | Tim Qur'an",
  },
  description:
    "Platform digital untuk mengelola program Tahfidz & Tahsin Al-Qur'an. Pantau hafalan, tajwid, dan perkembangan santri secara real-time.",
  icons: { icon: '/favicon.png', apple: '/favicon.png' },
  manifest: '/manifest.json',
  keywords: [
    "tahfidz quran",
    "tahsin quran",
    "hafalan quran",
    "lembaga quran",
    "sekolah tahfidz",
    "belajar quran",
    "generasi qurani",
    "manajemen santri",
    "sistem tahfidz",
    "Tim Quran",
  ],
  authors: [{ name: "Tim Qur'an" }],
  creator: "Tim Qur'an",
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: "Tim Qur'an",
    title: "Tim Qur'an — Sistem Manajemen Tahfidz & Tahsin",
    description:
      "Platform digital untuk mengelola program Tahfidz & Tahsin Al-Qur'an. Pantau hafalan, tajwid, dan perkembangan santri secara real-time.",
    url: getBaseUrl(),
  },
  twitter: {
    card: 'summary_large_image',
    title: "Tim Qur'an — Sistem Manajemen Tahfidz & Tahsin",
    description:
      "Platform digital untuk mengelola program Tahfidz & Tahsin Al-Qur'an.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: getBaseUrl(),
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfbf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${outfit.variable} ${amiri.variable} light`}>
      <body className="antialiased">
        {/* ── PWA / Mobile Meta ── */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Tim Qur'an" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Tim Qur'an" />
        <link rel="apple-touch-icon" href="/favicon.png" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'EducationalOrganization',
              name: "Tim Qur'an",
              description: "Platform digital untuk mengelola program Tahfidz & Tahsin Al-Qur'an.",
              url: getBaseUrl(),
              sameAs: [],
              areaServed: 'ID',
              knowsLanguage: ['id', 'ar'],
            }),
          }}
        />
        <SessionProvider>
          <SWRProvider>
            {children}
          </SWRProvider>
        </SessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
