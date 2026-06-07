"use client";

import Image from "next/image";
import { cacheBust } from '@/lib/image';

export interface StaffIDCardProps {
  name: string;
  role: 'Kabid' | 'Tim_Quran';
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
    label: "Guru Tim Qur'an",
    gradient: 'linear-gradient(180deg, #065f46 0%, #10b981 100%)',
    accentLight: '#d1fae5',
    accentMid: '#10b981',
    accent: '#065f46',
  },
};

// Portrait ID Card: 204 × 310 px (approx 54mm × 86mm — standard portrait ID)
const W = 204;
const H = 310;

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
        <div style={{ height: 56, background: "linear-gradient(135deg, #cbd5e1, #94a3b8)", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 14px", gap: 10 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#e2e8f0" }} />
          <div style={{ height: 11, background: "#e2e8f0", borderRadius: 4, width: "75%" }} />
          <div style={{ height: 1, background: "#f1f5f9", width: "100%" }} />
          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, width: "55%" }} />
          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, width: "65%" }} />
          <div style={{ height: 14, background: "#f1f5f9", borderRadius: 4, width: "40%" }} />
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
      borderRadius: 12,
      boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      background: "#ffffff",
      border: `1px solid ${accentLight}`,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* ── HEADER ── full-width gradient strip */}
      <div style={{
        background: gradient,
        padding: "10px 12px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        flexShrink: 0,
      }}>
        {/* Logos row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center" }}>
          {logoSekolahUrl ? (
            <div style={{
              width: 24, height: 24, borderRadius: 4, overflow: "hidden",
              background: "rgba(255,255,255,0.92)", padding: 1, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Image src={cacheBust(logoSekolahUrl) || logoSekolahUrl} alt={namaSekolah ?? "Sekolah"} width={22} height={22}
                style={{ objectFit: "contain", width: "100%", height: "100%" }}
                unoptimized />
            </div>
          ) : (
            <div style={{ width: 22, height: 22, borderRadius: 4, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
          )}

          {/* Institution text */}
          <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
            <p style={{
              color: "#ffffff", fontWeight: 800, fontSize: "8px",
              letterSpacing: "0.06em", margin: 0, lineHeight: 1.3,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {schoolName.toUpperCase()}
            </p>
            {namaSekolah && namaLembaga !== namaSekolah && (
              <p style={{
                color: "rgba(255,255,255,0.75)", fontSize: "6.5px",
                margin: 0, letterSpacing: "0.04em", lineHeight: 1.2,
              }}>
                {namaLembaga}
              </p>
            )}
          </div>

          {logoUrl ? (
            <div style={{
              width: 24, height: 24, borderRadius: 4, overflow: "hidden",
              background: "rgba(255,255,255,0.92)", padding: 1, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Image src={cacheBust(logoUrl) || logoUrl} alt={namaLembaga} width={22} height={22}
                style={{ objectFit: "contain", width: "100%", height: "100%" }}
                unoptimized />
            </div>
          ) : (
            <div style={{ width: 22, height: 22, borderRadius: 4, background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
          )}
        </div>

        {/* ID CARD label */}
        <div style={{
          background: "rgba(255,255,255,0.18)",
          borderRadius: 20, paddingInline: 10, paddingBlock: 2,
        }}>
          <p style={{ color: "#fff", fontSize: "7px", fontWeight: 700, letterSpacing: "0.15em", margin: 0 }}>
            KARTU IDENTITAS
          </p>
        </div>
      </div>

      {/* ── BODY — photo centered + info below */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "14px 14px 10px",
        gap: 10,
        overflow: "hidden",
      }}>
        {/* Foto — circle portrait */}
        <div style={{
          width: 80, height: 80,
          borderRadius: "50%",
          overflow: "hidden",
          border: `3px solid ${accentLight}`,
          background: "#f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 2px 8px ${accent}33`,
        }}>
          {photoUrl ? (
            <Image src={cacheBust(photoUrl) || photoUrl} alt={name} width={80} height={80}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
              unoptimized />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" width="36" height="36">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
            </svg>
          )}
        </div>

        {/* Nama */}
        <div style={{ textAlign: "center", width: "100%" }}>
          <p style={{
            fontWeight: 700, fontSize: "13px", color: "#0f172a",
            margin: "0 0 2px", lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
            {name}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: accentLight, width: "85%", flexShrink: 0 }} />

        {/* Info rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
            <span style={{ fontSize: "8px", color: "#64748b", width: 48, flexShrink: 0 }}>Jabatan</span>
            <span style={{ fontSize: "9px", color: accent, fontWeight: 700, lineHeight: 1.2 }}>{label}</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
            <span style={{ fontSize: "8px", color: "#64748b", width: 48, flexShrink: 0 }}>Unit</span>
            <span style={{ fontSize: "8px", color: "#0f172a", fontWeight: 600,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {namaLembaga}
            </span>
          </div>
          {namaSekolah && (
            <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ fontSize: "8px", color: "#64748b", width: 48, flexShrink: 0 }}>Sekolah</span>
              <span style={{ fontSize: "8px", color: "#334155", fontWeight: 500,
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
          padding: "3px 10px",
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: accentMid }} />
          <span style={{ fontSize: "8px", color: accent, fontWeight: 700, letterSpacing: "0.08em" }}>AKTIF</span>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        background: `linear-gradient(135deg, ${accentLight} 0%, #f8fafc 100%)`,
        padding: "4px 11px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderTop: `1px solid ${accentLight}`,
        flexShrink: 0,
      }}>
        <p style={{ fontSize: "7px", color: accent, fontWeight: 600, margin: 0, letterSpacing: "0.05em" }}>
          {schoolName}
        </p>
      </div>
    </div>
  );
}

export default StaffIDCard;
