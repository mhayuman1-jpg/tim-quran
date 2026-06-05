'use client';

// Wrapper untuk preview + cetak RaportPremium
// Dipakai di halaman raport sebagai modal preview

import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Button from '@/components/ui/Button';
import { Printer } from 'lucide-react';
import RaportPremium, { type RaportPremiumData } from './RaportPremium';

interface Props {
  data: RaportPremiumData;
}

export default function RaportPremiumViewer({ data }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Raport_${data.santri.nama}_${data.santri.semester}_${data.santri.tahun_ajaran}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 0; }
      @media print {
        body { margin: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `,
  });

  return (
    <div className="space-y-4">
      {/* Tombol cetak */}
      <div className="flex justify-end gap-2">
        <Button variant="primary" leftIcon={<Printer size={16} />} onClick={() => handlePrint()}>
          Cetak Raport
        </Button>
      </div>

      {/* Preview scroll */}
      <div className="border border-slate-200 rounded-xl overflow-auto bg-slate-100 p-4">
        <div className="w-fit mx-auto shadow-2xl">
          <RaportPremium ref={printRef} data={data} />
        </div>
      </div>
    </div>
  );
}
