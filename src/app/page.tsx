import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import PublicNavbar from "@/components/layout/PublicNavbar";
import LandingPage from "./(public)/page";

async function getProfil() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('profil_website')
      .select('nama_lembaga, logo_url')
      .single();
    return data;
  } catch {
    return null;
  }
}

export default async function RootPage() {
  const [session, profil] = await Promise.all([
    getServerSession(authOptions),
    getProfil(),
  ]);

  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar
        logoUrl={profil?.logo_url ?? null}
        namaLembaga={profil?.nama_lembaga ?? "Tim Qur'an"}
      />
      <main className="flex-1">
        <LandingPage />
      </main>
      <Footer namaLembaga={profil?.nama_lembaga ?? "Tim Qur'an"} />
    </div>
  );
}

function Footer({ namaLembaga }: { namaLembaga: string }) {
  return (
    <footer className="bg-emerald-950 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <p className="font-bold text-white text-lg mb-2">{namaLembaga}</p>
            <p className="text-emerald-400/70 text-sm leading-relaxed">
              Program Tahfidz &amp; Tahsin Al-Qur&apos;an untuk mencetak generasi Qur&apos;ani berakhlak mulia.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">Navigasi</p>
            <ul className="space-y-2 text-sm">
              {['beranda','profil','program','pengumuman','artikel','agenda'].map(id => (
                <li key={id}>
                  <a href={id === 'artikel' ? '/artikel' : `/#${id}`} className="text-emerald-400/70 hover:text-emerald-300 capitalize transition-colors">
                    {id.charAt(0).toUpperCase() + id.slice(1)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">Ayat Al-Qur&apos;an</p>
            <p className="text-emerald-300/80 text-lg leading-loose" dir="rtl">
              وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ
            </p>
            <p className="text-emerald-400/60 text-xs mt-1">(QS. Al-Qamar: 17)</p>
          </div>
        </div>
        <div className="border-t border-emerald-800 pt-6 text-center">
          <p className="text-emerald-600 text-xs">
            &copy; {new Date().getFullYear()} {namaLembaga}. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
