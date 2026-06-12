"use client";

import Image from "next/image";
import { cacheBust } from '@/lib/image';
import { toImageUrl } from '@/lib/storage/urls';

export interface StaffIDCardProps {
  name: string;
  role: 'Kabid' | 'Tim_Quran' | 'Sekretaris' | 'Bendahara';
  photoUrl?: string | null;
  namaLembaga?: string;
  logoUrl?: string | null;
  namaSekolah?: string | null;
  logoSekolahUrl?: string | null;
  cardId?: string;
}

const roleConfig = {
  Kabid: {
    label: 'Kepala Bidang',
    gradient: 'linear-gradient(180deg, #1e3a5f 0%, #2563eb 100%)',
    accentLight: '#dbeafe',
    accentMid: '#3b82f6',
    accent: '#1d4ed8',
  },
  Tim_Quran: {
    label: "Tim Qur'an",
    gradient: 'linear-gradient(180deg, #065f46 0%, #10b981 100%)',
    accentLight: '#d1fae5',
    accentMid: '#10b981',
    accent: '#065f46',
  },
  Sekretaris: {
    label: 'Sekretaris',
    gradient: 'linear-gradient(180deg, #7c2d12 0%, #f97316 100%)',
    accentLight: '#ffedd5',
    accentMid: '#f97316',
    accent: '#c2410c',
  },
  Bendahara: {
    label: 'Bendahara',
    gradient: 'linear-gradient(180deg, #581c87 0%, #a855f7 100%)',
    accentLight: '#f3e8ff',
    accentMid: '#a855f7',
    accent: '#7e22ce',
  },
};

// Staff ID Card portrait: 7.4cm × 10.5cm (278 × 396 px at 96 DPI)
const W = 278;
const H = 396;

export function StaffIDCard({
  name,
  role,
  photoUrl,
  namaLembaga = "Tim Qur'an",
  logoUrl,
  namaSekolah,
  logoSekolahUrl,
  cardId,
}: StaffIDCardProps) {

  // ── SKELETON ──────────────────────────────────────────────────────────
  if (!name) {
    return (
      <div id={cardId} className="animate-pulse" style={{
        width: W, height: H, borderRadius: 12,
        border: "1px solid #e2e8f0", background: "#ffffff",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        overflow: "hidden", display: "flex", flexDirection: "column",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}>
        <div style={{ height: 50, background: "linear-gradient(135deg, #cbd5e1, #94a3b8)", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 14px", gap: 9 }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#e2e8f0" }} />
          <div style={{ height: 10, background: "#e2e8f0", borderRadius: 4, width: "70%" }} />
          <div style={{ height: 1, background: "#f1f5f9", width: "100%" }} />
          <div style={{ height: 7, background: "#e2e8f0", borderRadius: 4, width: "55%" }} />
          <div style={{ height: 7, background: "#e2e8f0", borderRadius: 4, width: "65%" }} />
          <div style={{ height: 13, background: "#f1f5f9", borderRadius: 4, width: "40%" }} />
        </div>
        <div style={{ height: 22, background: "#f8fafc", borderTop: "1px solid #e2e8f0" }} />
      </div>
    );
  }

  const config = roleConfig[role];
  const { gradient, accentLight, accentMid, accent, label } = config;

  const schoolName = namaSekolah ?? namaLembaga;

  return (
    <div id={cardId} style={{
      width: W,
      height: H,
      borderRadius: 14,
      boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      background: "#ffffff",
      border: `1px solid ${accentLight}`,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* ── HEADER ── */}
      <div style={{
        background: gradient,
        padding: "12px 16px 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
      }}>
        {/* Logos row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", justifyContent: "center" }}>
          {logoSekolahUrl ? (
            <div style={{
              width: 36, height: 36, borderRadius: 6, overflow: "hidden",
              background: "rgba(255,255,255,0.92)", padding: 2, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Image src={cacheBust(toImageUrl(logoSekolahUrl)) || logoSekolahUrl || ''} alt={namaSekolah ?? "Sekolah"} width={32} height={32}
                style={{ objectFit: "contain", width: "100%", height: "100%" }}
                unoptimized />
            </div>
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
          )}

          <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
            <p style={{
              color: "#ffffff", fontWeight: 800, fontSize: "13px",
              letterSpacing: "0.06em", margin: 0, lineHeight: 1.3,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {schoolName.toUpperCase()}
            </p>
            {namaSekolah && namaLembaga !== namaSekolah && (
              <p style={{
                color: "rgba(255,255,255,0.8)", fontSize: "9px",
                margin: 0, letterSpacing: "0.04em", lineHeight: 1.2,
              }}>
                {namaLembaga}
              </p>
            )}
          </div>

          {logoUrl ? (
            <div style={{
              width: 36, height: 36, borderRadius: 6, overflow: "hidden",
              background: "rgba(255,255,255,0.92)", padding: 2, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Image src={cacheBust(toImageUrl(logoUrl)) || logoUrl || ''} alt={namaLembaga} width={32} height={32}
                style={{ objectFit: "contain", width: "100%", height: "100%" }}
                unoptimized />
            </div>
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
          )}
        </div>

        {/* ID CARD label */}
        <div style={{
          background: "rgba(255,255,255,0.2)",
          borderRadius: 20, paddingInline: 14, paddingBlock: 3,
        }}>
          <p style={{ color: "#fff", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", margin: 0 }}>
            KARTU IDENTITAS
          </p>
        </div>
      </div>

      {/* ── BODY — portrait: photo centered, info below */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "18px 20px 10px",
        gap: 12,
        overflow: "hidden",
      }}>
        {/* Foto — circle portrait */}
        <div style={{
          width: 110, height: 110,
          borderRadius: "50%",
          overflow: "hidden",
          border: `4px solid ${accentLight}`,
          background: "#f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 3px 12px ${accent}33`,
        }}>
          {photoUrl ? (
            <Image src={cacheBust(photoUrl) || photoUrl} alt={name} width={110} height={110}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
              unoptimized />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" width="48" height="48">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
            </svg>
          )}
        </div>

        {/* Nama */}
        <div style={{ textAlign: "center", width: "100%" }}>
          <p style={{
            fontWeight: 700, fontSize: "16px", color: "#0f172a",
            margin: "0 0 4px", lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
            {name}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: accentLight, width: "80%", flexShrink: 0 }} />

        {/* Info rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ fontSize: "10px", color: "#64748b", width: 56, flexShrink: 0 }}>Jabatan</span>
            <span style={{ fontSize: "11px", color: accent, fontWeight: 700, lineHeight: 1.2 }}>{label}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ fontSize: "10px", color: "#64748b", width: 56, flexShrink: 0 }}>Unit</span>
            <span style={{ fontSize: "10px", color: "#0f172a", fontWeight: 600,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {namaLembaga}
            </span>
          </div>
          {namaSekolah && (
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontSize: "10px", color: "#64748b", width: 56, flexShrink: 0 }}>Sekolah</span>
              <span style={{ fontSize: "10px", color: "#334155", fontWeight: 500,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {namaSekolah}
              </span>
            </div>
          )}
        </div>

        {/* Badge AKTIF */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: accentLight, borderRadius: 20,
          padding: "4px 14px", marginTop: "auto",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: accentMid }} />
          <span style={{ fontSize: "10px", color: accent, fontWeight: 700, letterSpacing: "0.1em" }}>AKTIF</span>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        background: `linear-gradient(135deg, ${accentLight} 0%, #f8fafc 100%)`,
        padding: "5px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderTop: `1px solid ${accentLight}`,
        flexShrink: 0,
      }}>
        <p style={{ fontSize: "9px", color: accent, fontWeight: 600, margin: 0, letterSpacing: "0.05em" }}>
          {schoolName}
        </p>
      </div>
    </div>
  );
}

export default StaffIDCard;
