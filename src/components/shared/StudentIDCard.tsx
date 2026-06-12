"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { generateQRCodeDataURL } from "@/lib/qrcode";
import { toImageUrl } from "@/lib/storage/urls";

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
  logoSekolahUrl?: string | null;
  namaSekolah?: string | null;
  accentColor?: string;
  showDownload?: boolean;
  cardId?: string;
}

export function StudentIDCard({
  student,
  namaLembaga = "Tim Qur'an",
  logoUrl,
  logoSekolahUrl,
  namaSekolah,
  accentColor,
  showDownload: _showDownload,
  cardId,
}: StudentIDCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    generateQRCodeDataURL(student.qr_code, 150)
      .then(setQrDataUrl)
      .catch(() => {});
  }, [student.qr_code]);

  // Deep Emerald + Royal Gold
  const c = {
    deep:      "#0d3b2e",
    primary:   "#1a6b4f",
    mid:       "#22805e",
    light:     "#e6f2ec",
    lighter:   "#f4faf7",
    gold:      "#d4a843",
    goldLight: "#f5edd6",
    goldDark:  "#b8922f",
    white:     "#ffffff",
    slate:     "#475569",
    muted:     "#8a9aab",
    body:      "#1a2a24",
  };

  const headerTitle = namaSekolah ? namaSekolah.toUpperCase() : namaLembaga.toUpperCase();
  const headerSub = namaSekolah ? namaLembaga : "KARTU SANTRI";
  const className = student.classes?.name?.replace(/^\d+\s*/i, '') || "—";

  return (
    <div
      id={cardId}
      className="id-card relative flex flex-col overflow-hidden"
      style={{
        width: "321px",
        height: "208px",
        borderRadius: "14px",
        boxShadow: "0 12px 40px rgba(13,59,46,0.25), 0 4px 12px rgba(0,0,0,0.1)",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background: `linear-gradient(155deg, ${c.deep} 0%, ${c.primary} 35%, ${c.mid} 65%, ${c.gold}40 100%)`,
      }}
    >
      {/* ── TOP ROW: Logos + Title ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 14px 0",
        position: "relative",
      }}>
        {/* Logo sekolah */}
        {logoSekolahUrl ? (
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px", overflow: "hidden",
            flexShrink: 0, background: `${c.white}e0`, padding: "2px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 3px 12px rgba(0,0,0,0.2), inset 0 0 0 1.5px ${c.gold}50`,
          }}>
            <Image src={logoSekolahUrl} alt={namaSekolah ?? "Sekolah"} width={32} height={32}
              style={{ objectFit: "contain", width: "100%", height: "100%" }}
              unoptimized />
          </div>
        ) : (
          <div style={{
            width: "34px", height: "34px", borderRadius: "10px",
            background: `${c.white}10`, flexShrink: 0,
          }} />
        )}

        {/* Center title */}
        <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          <p style={{
            color: c.white, fontWeight: 800, fontSize: "10px",
            letterSpacing: "0.1em", margin: 0, lineHeight: 1.3,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}>
            {headerTitle}
          </p>
          <p style={{
            color: c.goldLight, fontSize: "6.5px",
            margin: 0, letterSpacing: "0.14em", lineHeight: 1.2,
            textTransform: "uppercase", fontWeight: 700,
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}>
            {headerSub}
          </p>
        </div>

        {/* Logo Tim Qur'an */}
        {logoUrl ? (
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px", overflow: "hidden",
            flexShrink: 0, background: `${c.white}e0`, padding: "2px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 3px 12px rgba(0,0,0,0.2), inset 0 0 0 1.5px ${c.gold}50`,
          }}>
            <Image src={logoUrl} alt={namaLembaga} width={32} height={32}
              style={{ objectFit: "contain", width: "100%", height: "100%" }}
              unoptimized />
          </div>
        ) : (
          <div style={{
            width: "34px", height: "34px", borderRadius: "10px",
            background: `${c.white}10`, display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.goldLight} strokeWidth="1.5">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* ── GOLD DIVIDER ── */}
      <div style={{
        margin: "7px 14px 0",
        height: "2px",
        background: `linear-gradient(90deg, transparent 2%, ${c.gold}80 20%, ${c.gold} 50%, ${c.gold}80 80%, transparent 98%)`,
        boxShadow: `0 1px 4px ${c.gold}30`,
      }} />

      {/* ── MAIN CONTENT ── */}
      <div style={{
        display: "flex", flex: 1,
        padding: "8px 14px", gap: "14px",
        alignItems: "center", overflow: "hidden",
      }}>

        {/* Foto — VIP round frame */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {/* Outer gold ring */}
          <div style={{
            position: "absolute", inset: "-5px",
            borderRadius: "50%",
            background: `conic-gradient(from 0deg, ${c.gold}, ${c.goldLight}, ${c.gold}, ${c.goldDark}, ${c.gold})`,
          }} />
          <div style={{
            position: "absolute", inset: "-3px",
            borderRadius: "50%",
            background: c.deep,
          }} />
          <div style={{
            width: "68px", height: "68px", borderRadius: "50%", flexShrink: 0,
            overflow: "hidden",
            background: c.lighter, display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            {student.photo_url ? (
              <Image src={toImageUrl(student.photo_url, 'timquran-profile-photos') || ''} alt={student.nama} width={68} height={68}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
                unoptimized />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth="1.2" width="28" height="28">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
              </svg>
            )}
          </div>
        </div>

        {/* Info siswa */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: "4px" }}>
          {/* Nama — white with strong shadow */}
          <p style={{
            fontWeight: 800, fontSize: "14px", color: c.white,
            margin: 0, lineHeight: 1.2, letterSpacing: "0.02em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            textShadow: "0 1px 3px rgba(0,0,0,0.4), 0 0 8px rgba(0,0,0,0.15)",
          }}>
            {student.nama}
          </p>

          {/* Detail panel — frosted glass */}
          <div style={{
            display: "flex", flexDirection: "column", gap: "3px",
            background: "rgba(255,255,255,0.12)", borderRadius: "8px",
            padding: "6px 8px", marginTop: "2px",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                fontSize: "6.5px", color: c.goldLight, width: "30px", flexShrink: 0,
                textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700,
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}>NISN</span>
              <span style={{
                fontSize: "9px", color: c.white, fontFamily: "'SF Mono', 'Consolas', monospace",
                fontWeight: 700, letterSpacing: "0.04em",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}>
                {student.nisn}
              </span>
            </div>
            <div style={{
              height: "1px", background: `linear-gradient(90deg, ${c.gold}40, transparent)`,
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                fontSize: "6.5px", color: c.goldLight, width: "30px", flexShrink: 0,
                textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700,
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}>Kelas</span>
              <span style={{
                fontSize: "9px", color: c.goldLight, fontWeight: 700,
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}>
                {className}
              </span>
            </div>
          </div>

          {/* Badge aktif — gold pill */}
          <div style={{
            marginTop: "2px",
            display: "inline-flex", alignItems: "center", gap: "4px",
            background: "rgba(212,168,67,0.18)", borderRadius: "20px",
            padding: "2px 8px 2px 6px", width: "fit-content",
            border: "1px solid rgba(212,168,67,0.35)",
          }}>
            <div style={{
              width: "5px", height: "5px", borderRadius: "50%",
              background: c.gold,
              boxShadow: "0 0 6px rgba(212,168,67,0.7)",
            }} />
            <span style={{
              fontSize: "6.5px", color: c.goldLight, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            }}>AKTIF</span>
          </div>
        </div>

        {/* QR Code — frosted frame */}
        <div style={{
          flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
        }}>
          <div style={{
            padding: "4px", borderRadius: "10px",
            background: "rgba(255,255,255,0.15)",
            border: "1.5px solid rgba(255,255,255,0.2)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code"
                style={{ width: "62px", height: "62px", borderRadius: "6px", display: "block" }} />
            ) : (
              <div style={{
                width: "62px", height: "62px", borderRadius: "6px",
                background: "rgba(255,255,255,0.1)",
              }} />
            )}
          </div>
          <p style={{
            fontSize: "6px", color: c.goldLight, textAlign: "center", margin: 0,
            lineHeight: 1.2, letterSpacing: "0.08em",
            textTransform: "uppercase", fontWeight: 700,
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}>
            Scan Absensi
          </p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        padding: "4px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: "1px solid rgba(212,168,67,0.25)",
        flexShrink: 0,
        background: "rgba(13,59,46,0.5)",
      }}>
        <p style={{
          fontSize: "6.5px", color: c.goldLight, fontWeight: 600, margin: 0,
          letterSpacing: "0.03em",
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }}>
          {namaSekolah ? `${namaSekolah} · ${namaLembaga}` : namaLembaga}
        </p>
        <p style={{
          fontSize: "6px", color: "rgba(255,255,255,0.6)", margin: 0,
          fontFamily: "'SF Mono', 'Consolas', monospace",
          letterSpacing: "0.05em",
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }}>
          {student.qr_code.slice(0, 8).toUpperCase()}
        </p>
      </div>
    </div>
  );
}

export default StudentIDCard;
