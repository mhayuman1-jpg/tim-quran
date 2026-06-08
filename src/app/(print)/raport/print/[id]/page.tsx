import RaportTahfidzDocument from '@/components/features/raport/RaportTahfidzDocument';
import type { RaportTahfidzData } from '@/components/features/raport/raport-tahfidz-types';
import { buildLogoReplacements } from '@/lib/raport/embed-logos';
import { fetchRaportForExport } from '@/lib/raport/fetch-raport-data';

export const dynamic = 'force-dynamic';

/**
 * Halaman cetak untuk Playwright PDF.
 * Render komponen React di server — sama persis dengan preview dashboard.
 */
export default async function RaportPrintPage({ params }: { params: { id: string } }) {
  try {
    const { raport, profil } = await fetchRaportForExport(params.id);
    const { profil: profilWithLogos } = await buildLogoReplacements(profil);

    return (
      <div data-pdf-ready="true">
        <RaportTahfidzDocument
          raport={raport as unknown as RaportTahfidzData}
          profil={profilWithLogos ?? {}}
        />
      </div>
    );
  } catch {
    return <div data-pdf-error="true">Gagal memuat raport.</div>;
  }
}
