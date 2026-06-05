import { ReactNode } from 'react';
import PublicNavbar from '@/components/layout/PublicNavbar';

export const dynamic = 'force-dynamic';

async function getProfil() {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profil_website?select=nama_lembaga,logo_url&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

export default async function AgendaLayout({ children }: { children: ReactNode }) {
  const profil = await getProfil();
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar
        logoUrl={profil?.logo_url ?? null}
        namaLembaga={profil?.nama_lembaga ?? "Tim Qur'an"}
      />
      <main className="flex-1 pt-16">{children}</main>
      <footer className="bg-stone-900">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-stone-600 text-xs">
              &copy; {new Date().getFullYear()} {profil?.nama_lembaga ?? "Tim Qur'an"}. Semua hak dilindungi.
            </p>
            <a href="/" className="text-xs text-stone-500 hover:text-amber-400 transition-colors">
              ← Kembali ke Beranda
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
