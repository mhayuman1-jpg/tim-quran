'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import Button from '@/components/ui/Button';
import { Printer } from 'lucide-react';
import RaportTahfidzDocument from '@/components/features/raport/RaportTahfidzDocument';
import { getRaportBrowserPrintStyle } from '@/lib/raport/print-config';
import '@/styles/raport-print.css';

export type {
  RaportTahfidzData,
  DetailSurahData,
  ProfilRaportData,
} from '@/components/features/raport/raport-tahfidz-types';

import type {
  RaportTahfidzData,
  DetailSurahData,
  ProfilRaportData,
} from '@/components/features/raport/raport-tahfidz-types';

export default function RaportTahfidzPrintable({
  raport,
  hideButtons,
  printOnly = false,
  profil: profilProp,
  inlineEdit = false,
  contentRef,
  onInlineChange,
  onInlineDetailChange,
  onInlineAddRow,
  onInlineRemoveRow,
  siblingRaports = [],
}: {
  raport: RaportTahfidzData;
  hideButtons?: boolean;
  printOnly?: boolean;
  profil?: ProfilRaportData;
  inlineEdit?: boolean;
  contentRef?: React.Ref<HTMLDivElement>;
  onInlineChange?: (field: keyof RaportTahfidzData, value: string | null) => void;
  onInlineDetailChange?: (index: number, field: keyof DetailSurahData, value: string | null) => void;
  onInlineAddRow?: () => void;
  onInlineRemoveRow?: (index: number) => void;
  siblingRaports?: RaportTahfidzData[];
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [profil, setProfil] = useState<ProfilRaportData>(profilProp ?? {});

  useEffect(() => {
    if (profilProp) setProfil(profilProp);
  }, [profilProp]);

  useEffect(() => {
    if (profilProp) return;
    fetch('/api/website/profil')
      .then(r => r.json())
      .then(d => { if (d.data) setProfil(d.data); })
      .catch(() => {});
  }, [profilProp]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Raport_Tahfidz_${raport.santri?.nama ?? 'Siswa'}_${raport.periode}`,
    pageStyle: getRaportBrowserPrintStyle(raport.juz),
  });

  const mainDocProps = {
    raport,
    profil,
    inlineEdit,
    onInlineChange,
    onInlineDetailChange,
    onInlineAddRow,
    onInlineRemoveRow,
  };

  // Sort siblings by juz (ascending) for consistent ordering
  const sortedSiblings = [...siblingRaports].sort((a, b) => Number(a.juz ?? 0) - Number(b.juz ?? 0));

  if (printOnly) {
    return (
      <>
        <RaportTahfidzDocument key={`print-only-${raport.id}`} {...mainDocProps} />
        {sortedSiblings.map((sib) => (
          <div key={`print-sib-${sib.id}`} style={{ pageBreakBefore: 'always' }}>
            <RaportTahfidzDocument key={`print-sib-doc-${sib.id}`} raport={sib} profil={profil} />
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {!hideButtons && (
        <div className="no-print flex justify-end">
          <Button variant="primary" leftIcon={<Printer size={16} />} onClick={() => handlePrint()}>
            Cetak Raport{sortedSiblings.length > 0 ? ` (${sortedSiblings.length + 1} Juz)` : ''}
          </Button>
        </div>
      )}

      {/* Preview — main raport + siblings */}
      <div className="raport-preview-chrome no-print">
        <div className="raport-preview-frame">
          <div className="raport-preview-sheet">
            <RaportTahfidzDocument key={`preview-${raport.id}`} {...mainDocProps} />
          </div>
          {sortedSiblings.map((sib) => (
            <div key={`preview-sib-${sib.id}`} className="raport-preview-sheet" style={{ marginTop: '2rem' }}>
              <div className="text-xs text-slate-400 text-center mb-1 no-print">— Juz {sib.juz ?? '?'} —</div>
              <RaportTahfidzDocument key={`preview-sib-doc-${sib.id}`} raport={sib} profil={profil} />
            </div>
          ))}
        </div>
      </div>

      {/* Print portal — main raport + siblings with page breaks */}
      <div className="raport-print-portal" aria-hidden="true">
        <RaportTahfidzDocument key={`print-${raport.id}`} ref={contentRef ?? printRef} {...mainDocProps} />
        {sortedSiblings.map((sib) => (
          <div key={`print-sib-${sib.id}`} style={{ pageBreakBefore: 'always' }}>
            <RaportTahfidzDocument key={`print-sib-doc-${sib.id}`} raport={sib} profil={profil} />
          </div>
        ))}
      </div>
    </div>
  );
}
