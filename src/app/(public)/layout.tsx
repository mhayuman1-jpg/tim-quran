// Server component — fetch profil di sini lalu pass ke navbar
import { ReactNode } from 'react';
import PublicNavbar from '@/components/layout/PublicNavbar';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getProfil() {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profil_website?select=nama_lembaga,logo_url,logo_sekolah_url,nama_sekolah&limit=1`;
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

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const profil = await getProfil();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar
        logoUrl={profil?.logo_url ?? null}
        namaLembaga={profil?.nama_lembaga ?? "Tim Qur'an"}
      />
      <main className="flex-1 pt-16">{children}</main>
      <footer className="bg-stone-900">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-8">
            <div>
              <p className="font-bold text-white text-lg mb-3">
                {profil?.nama_lembaga ?? "Tim Qur'an"}
              </p>
              <p className="text-amber-400/70 text-sm leading-relaxed">
                Program Tahfidz &amp; Tahsin Al-Qur&apos;an untuk mencetak generasi Qur&apos;ani berakhlak mulia.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white text-sm mb-4">Navigasi</p>
              <ul className="space-y-2">
                {[
                  { label: 'Beranda', href: '/#beranda' },
                  { label: 'Profil', href: '/#profil' },
                  { label: 'Program', href: '/#program' },
                  { label: 'Pengumuman', href: '/#pengumuman' },
                  { label: 'Artikel', href: '/artikel' },
                  { label: 'Agenda', href: '/#agenda' },
                ].map(l => (
                  <li key={l.href}>
                    <a href={l.href} className="text-amber-400/60 hover:text-amber-300 text-sm transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-white text-sm mb-4">Ayat</p>
              <p className="text-amber-300/90 text-xl leading-loose" dir="rtl">
                وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ
              </p>
              <p className="text-amber-400/50 text-xs mt-2">QS. Al-Qamar: 17</p>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-stone-600 text-xs">
              &copy; {new Date().getFullYear()} {profil?.nama_lembaga ?? "Tim Qur'an"}. Semua hak dilindungi.
            </p>
            <a href="/login" className="text-xs text-stone-500 hover:text-amber-400 transition-colors">
              Masuk Dashboard →
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
