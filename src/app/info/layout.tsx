import { ReactNode } from 'react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getProfil() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('profil_website')
      .select('nama_lembaga,logo_url,nama_sekolah')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[InfoLayout] Supabase error:', error.message);
      return null;
    }

    return data ?? null;
  } catch (error) {
    console.error('[InfoLayout] Fetch error:', error);
    return null;
  }
}

export default async function PengumumanLayout({ children }: { children: ReactNode }) {
  const profil = await getProfil();
  return (
    <div className="min-h-dvh flex flex-col bg-slate-950 text-slate-100">
      <PublicNavbar
        logoUrl={profil?.logo_url ?? null}
        namaLembaga={profil?.nama_lembaga ?? "Tim Qur'an"}
        namaSekolah={profil?.nama_sekolah ?? undefined}
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
