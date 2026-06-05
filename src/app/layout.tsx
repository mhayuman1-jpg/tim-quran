import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tim Qur'an — Sistem Manajemen Tahfidz & Tahsin",
  description: "Platform digital untuk mengelola program Tahfidz & Tahsin Al-Qur'an.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="antialiased bg-slate-50 text-slate-900">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
