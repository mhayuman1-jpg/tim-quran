import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import WaliHeader from './WaliHeader';
export const dynamic = 'force-dynamic';

export default async function WaliLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const isAuthenticated = session?.user?.role === 'Wali_Murid';

  // User belum login → render tanpa header (agar halaman login bisa tampil)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdfa 100%)'}}>
        {children}
      </div>
    );
  }

  // User sudah login → render dengan header lengkap
  return (
    <div className="min-h-screen flex flex-col" style={{background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdfa 100%)'}}>
      <WaliHeader />
      <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
