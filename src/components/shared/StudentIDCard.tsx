"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { generateQRCodeDataURL } from "@/lib/qrcode";

export interface IDCardStudent {
  id: string;
  nisn: string;
  nama: string;
  qr_code: string;
  photo_url?: string | null;
  juz_terakhir?: number;
  classes?: { id?: string; name: string } | null;
}

interface StudentIDCardProps {
  student: IDCardStudent;
  namaLembaga?: string;
  logoUrl?: string | null;
  /** Logo sekolah/yayasan — tampil di kiri header */
  logoSekolahUrl?: string | null;
  /** Nama sekolah/yayasan — tampil di header dan footer */
  namaSekolah?: string | null;
  accentColor?: string;
  /** Tampilkan tombol download PNG */
  showDownload?: boolean;
  /** ID unik untuk referensi DOM saat download */
  cardId?: string;
}

export function StudentIDCard({
  student,
  namaLembaga = "Tim Qur'an",
  logoUrl,
  logoSekolahUrl,
  namaSekolah,
  accentColor = "#065f46",
  showDownload: _showDownload,
  cardId,
}: StudentIDCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    generateQRCodeDataURL(student.qr_code, 150)
      .then(setQrDataUrl)
      .catch(() => {});
  }, [student.qr_code]);

  const accent    = accentColor;
  const accentLight = "#d1fae5";
  const accentMid   = "#10b981";

  // Judul utama di header: nama sekolah jika ada, otherwise nama lembaga
  const headerTitle = namaSekolah ? namaSekolah.toUpperCase() : namaLembaga.toUpperCase();
  const headerSub   = namaSekolah ? namaLembaga : "KARTU SANTRI";

  return (
    <div
      id={cardId}
      className="id-card relative flex flex-col overflow-hidden"
      style={{
        width: "323px",
        height: "204px",
        borderRadius: "10px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background: "#ffffff",
        border: `1px solid ${accentLight}`,
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${accent} 0%, ${accentMid} 100%)`,
        padding: "7px 10px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
      }}>
        {/* Logo sekolah — kiri */}
        {logoSekolahUrl ? (
          <div style={{
            width: "30px", height: "30px", borderRadius: "6px", overflow: "hidden",
            flexShrink: 0, background: "rgba(255,255,255,0.95)", padding: "2px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Image src={logoSekolahUrl} alt={namaSekolah ?? "Sekolah"} width={26} height={26}
              style={{ objectFit: "contain", width: "100%", height: "100%" }}
              unoptimized />
          </div>
        ) : (
          /* Placeholder jika tidak ada logo sekolah */
          <div style={{
            width: "28px", height: "28px", borderRadius: "6px",
            background: "rgba(255,255,255,0.15)", flexShrink: 0,
          }} />
        )}

        {/* Teks tengah */}
        <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          <p style={{
            color: "#ffffff", fontWeight: 800, fontSize: "9px",
            letterSpacing: "0.07em", margin: 0, lineHeight: 1.3,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {headerTitle}
          </p>
          <p style={{
            color: "rgba(255,255,255,0.78)", fontSize: "7.5px",
            margin: 0, letterSpacing: "0.05em", lineHeight: 1.2,
          }}>
            {headerSub}
          </p>
        </div>

        {/* Logo Tim Qur'an — kanan */}
        {logoUrl ? (
          <div style={{
            width: "30px", height: "30px", borderRadius: "6px", overflow: "hidden",
            flexShrink: 0, background: "rgba(255,255,255,0.95)", padding: "2px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Image src={logoUrl} alt={namaLembaga} width={26} height={26}
              style={{ objectFit: "contain", width: "100%", height: "100%" }}
              unoptimized />
          </div>
        ) : (
          <div style={{
            width: "28px", height: "28px", borderRadius: "6px",
            background: "rgba(255,255,255,0.2)", display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* ── BODY ───────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", flex: 1,
        padding: "9px 11px", gap: "10px",
        alignItems: "center", overflow: "hidden",
      }}>

        {/* Foto siswa */}
        <div style={{
          width: "60px", height: "76px", borderRadius: "6px", flexShrink: 0,
          overflow: "hidden", border: `2px solid ${accentLight}`,
          background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {student.photo_url ? (
            <Image src={student.photo_url} alt={student.nama} width={60} height={76}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
              unoptimized />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" width="30" height="30">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
            </svg>
          )}
        </div>

        {/* Info siswa */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: "4px" }}>
          <p style={{
            fontWeight: 700, fontSize: "12px", color: "#0f172a",
            margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {student.nama}
          </p>

          <div style={{ height: "1px", background: accentLight, width: "100%" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              <span style={{ fontSize: "8px", color: "#64748b", width: "38px", flexShrink: 0 }}>NISN</span>
              <span style={{ fontSize: "8px", color: "#0f172a", fontFamily: "monospace", fontWeight: 600 }}>
                {student.nisn}
              </span>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <span style={{ fontSize: "8px", color: "#64748b", width: "38px", flexShrink: 0 }}>Kelas</span>
              <span style={{ fontSize: "8px", color: "#0f172a", fontWeight: 600 }}>
                {student.classes?.name ?? "—"}
              </span>
            </div>
            {student.juz_terakhir && (
              <div style={{ display: "flex", gap: "4px" }}>
                <span style={{ fontSize: "8px", color: "#64748b", width: "38px", flexShrink: 0 }}>Juz</span>
                <span style={{ fontSize: "8px", color: accent, fontWeight: 700 }}>
                  Juz {student.juz_terakhir}
                </span>
              </div>
            )}
          </div>

          {/* Badge aktif */}
          <div style={{
            marginTop: "2px", display: "inline-flex", alignItems: "center", gap: "3px",
            background: accentLight, borderRadius: "4px", padding: "2px 6px", width: "fit-content",
          }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: accentMid }} />
            <span style={{ fontSize: "7px", color: accent, fontWeight: 600 }}>AKTIF</span>
          </div>
        </div>

        {/* QR Code */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
          {qrDataUrl ? (
             
            <img src={qrDataUrl} alt="QR Code" style={{ width: "68px", height: "68px", borderRadius: "4px" }} />
          ) : (
            <div style={{ width: "68px", height: "68px", background: "#f1f5f9", borderRadius: "4px" }} />
          )}
          <p style={{ fontSize: "6.5px", color: "#94a3b8", textAlign: "center", margin: 0, lineHeight: 1.2 }}>
            Scan<br/>Absensi
          </p>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(90deg, ${accentLight} 0%, #f0fdf4 100%)`,
        padding: "3px 11px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: `1px solid ${accentLight}`,
        flexShrink: 0,
      }}>
        <p style={{ fontSize: "7px", color: accent, fontWeight: 600, margin: 0 }}>
          {namaSekolah ? `${namaSekolah} · ${namaLembaga}` : namaLembaga}
        </p>
        <p style={{ fontSize: "6.5px", color: "#94a3b8", margin: 0, fontFamily: "monospace" }}>
          {student.qr_code.slice(0, 8).toUpperCase()}
        </p>
      </div>
    </div>
  );
}

export default StudentIDCard;
