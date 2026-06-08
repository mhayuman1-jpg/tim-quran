'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import Button from '@/components/ui/Button';
import { Printer } from 'lucide-react';
import RaportTahfidzDocument from '@/components/features/raport/RaportTahfidzDocument';
import { RAPORT_BROWSER_PRINT_STYLE } from '@/lib/raport/print-config';
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
    pageStyle: RAPORT_BROWSER_PRINT_STYLE,
  });

  const documentProps = {
    raport,
    profil,
    inlineEdit,
    onInlineChange,
    onInlineDetailChange,
    onInlineAddRow,
    onInlineRemoveRow,
  };

  if (printOnly) {
    return <RaportTahfidzDocument key={`print-only-${raport.id}`} {...documentProps} />;
  }

  return (
    <div className="space-y-4">
      {!hideButtons && (
        <div className="no-print flex justify-end">
          <Button variant="primary" leftIcon={<Printer size={16} />} onClick={() => handlePrint()}>
            Cetak Raport
          </Button>
        </div>
      )}

      <div className="raport-preview-chrome no-print">
        <div className="raport-preview-frame">
          <div className="raport-preview-sheet">
            <RaportTahfidzDocument key={`preview-${raport.id}`} {...documentProps} />
          </div>
        </div>
      </div>

      <div className="raport-print-portal" aria-hidden="true">
        <RaportTahfidzDocument key={`print-${raport.id}`} ref={contentRef ?? printRef} {...documentProps} />
      </div>
    </div>
  );
}
