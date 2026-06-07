// src/app/profil/page.tsx — Halaman Profil Publik

import Image from 'next/image';
import { Globe, MapPin, Mail, Phone, AtSign, PlayCircle } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Profil — Tim Qur\'an',
  description: 'Profil, visi, dan misi Tim Qur\'an.',
};

async function getData() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('profil_website')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[ProfilPage] Supabase error:', error.message);
      return null;
    }

    return data ?? null;
  } catch (error) {
    console.error('[ProfilPage] Fetch error:', error);
    return null;
  }
}

export default async function ProfilPage() {
  const pd = await getData();

  const profil = pd ?? {
    nama_lembaga: "Tim Qur'an",
    nama_sekolah: null,
    deskripsi: "Program Tahfidz dan Tahsin Al-Qur'an yang berdedikasi mencetak generasi Qur'ani berakhlak mulia.",
    visi: "Menjadi lembaga Tahfidz & Tahsin terdepan.",
    misi: ["Pembelajaran berkualitas", "Mencetak hafidz berakhlak"],
    logo_url: null,
    logo_sekolah_url: null,
    alamat: null, email: null, telepon: null, instagram: null, youtube: null, facebook: null,
  };

  const misi: string[] = Array.isArray(profil.misi)
    ? profil.misi
    : typeof profil.misi === 'string' && profil.misi.trim().startsWith('[')
      ? JSON.parse(profil.misi)
      : ["Pembelajaran berkualitas", "Mencetak hafidz berakhlak"];

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center items-center gap-6 mb-8 flex-wrap">
            {profil.logo_sekolah_url && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/90 p-1.5 shadow-lg">
                <Image src={profil.logo_sekolah_url} alt={profil.nama_sekolah ?? 'Sekolah'} width={72} height={72} className="object-contain w-full h-full" />
              </div>
            )}
            {profil.logo_url && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/90 p-1.5 shadow-lg">
                <Image src={profil.logo_url} alt={profil.nama_lembaga} width={72} height={72} className="object-contain w-full h-full" />
              </div>
            )}
          </div>
          {profil.nama_sekolah && (
            <p className="text-amber-300/70 text-sm font-medium mb-1">{profil.nama_sekolah}</p>
          )}
          <h1 className="text-4xl font-bold text-white mb-4">{profil.nama_lembaga}</h1>
          <p className="text-amber-100/70 text-lg max-w-2xl mx-auto leading-relaxed">{profil.deskripsi}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-10">
        {/* Visi */}
        <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl shadow-slate-950/30 border border-slate-800 relative overflow-hidden">
          <div className="absolute -top-4 -left-4 text-[8rem] text-amber-100 font-serif leading-none select-none" aria-hidden="true">&ldquo;</div>
          <div className="relative z-10">
            <span className="inline-block px-3 py-1 rounded-full bg-sky-800 text-cyan-200 text-xs font-semibold mb-4 border border-sky-700 uppercase tracking-wider">Visi</span>
            <p className="text-slate-100 text-xl leading-relaxed font-medium">{profil.visi || "Menjadi lembaga Tahfidz & Tahsin terdepan."}</p>
          </div>
        </div>

        {/* Misi */}
        <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl shadow-slate-950/30 border border-slate-800">
          <span className="inline-block px-3 py-1 rounded-full bg-slate-800 text-cyan-200 text-xs font-semibold mb-6 border border-slate-700 uppercase tracking-wider">Misi</span>
          <div className="space-y-3">
            {misi.map((m, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-500 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-white bg-gradient-to-br from-sky-500 to-cyan-400 shadow-sm">
                  {i + 1}
                </div>
                <p className="text-slate-200 leading-relaxed pt-0.5">{m}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Kontak */}
        {(profil.alamat || profil.email || profil.telepon || profil.instagram || profil.youtube) && (
          <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl shadow-slate-950/30 border border-slate-800">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-800 text-cyan-200 text-xs font-semibold mb-6 border border-slate-700 uppercase tracking-wider">Kontak</span>
            <div className="grid sm:grid-cols-2 gap-4">
              {profil.alamat && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800 border border-slate-700">
                  <MapPin size={16} className="text-cyan-300 mt-0.5 shrink-0" />
                  <p className="text-slate-200 text-sm">{profil.alamat}</p>
                </div>
              )}
              {profil.email && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800 border border-slate-700">
                  <Mail size={16} className="text-cyan-300 shrink-0" />
                  <p className="text-slate-200 text-sm">{profil.email}</p>
                </div>
              )}
              {profil.telepon && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800 border border-slate-700">
                  <Phone size={16} className="text-cyan-300 shrink-0" />
                  <p className="text-slate-200 text-sm">{profil.telepon}</p>
                </div>
              )}
              {profil.facebook && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800 border border-slate-700">
                  <Globe size={16} className="text-cyan-300 shrink-0" />
                  <a href={profil.facebook.startsWith('http') ? profil.facebook : `https://facebook.com/${String(profil.facebook).replace(/^\//, '')}`}
                    target="_blank" rel="noreferrer noopener"
                    className="text-slate-200 text-sm hover:text-cyan-200 transition-colors">
                    {String(profil.facebook).replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {profil.instagram && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800 border border-slate-700">
                  <AtSign size={16} className="text-cyan-300 shrink-0" />
                  <a href={profil.instagram.startsWith('http') ? profil.instagram : `https://instagram.com/${String(profil.instagram).replace(/^@/, '').replace(/^\//, '')}`}
                    target="_blank" rel="noreferrer noopener"
                    className="text-slate-200 text-sm hover:text-cyan-200 transition-colors">
                    {profil.instagram}
                  </a>
                </div>
              )}
              {profil.youtube && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800 border border-slate-700">
                  <PlayCircle size={16} className="text-cyan-300 shrink-0" />
                  <a href={profil.youtube.startsWith('http') ? profil.youtube : `https://youtube.com/${String(profil.youtube).replace(/^\//, '')}`}
                    target="_blank" rel="noreferrer noopener"
                    className="text-slate-200 text-sm hover:text-cyan-200 transition-colors">
                    {String(profil.youtube).replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
