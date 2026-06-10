import type { Metadata } from "next";
import { Inter, Amiri } from "next/font/google";
import { SessionProvider } from "./providers";
import "./globals.css";
import { SWRProvider } from "./swr-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tim Qur'an — Sistem Manajemen Tahfidz & Tahsin",
  description: "Platform digital untuk mengelola program Tahfidz & Tahsin Al-Qur'an.",
  icons: { icon: "/favicon.ico" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${amiri.variable} light`}>
      <body className="antialiased">
        <SessionProvider>
          <SWRProvider>
            {children}
          </SWRProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
