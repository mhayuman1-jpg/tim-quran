import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import '@/styles/raport-print.css';

export const dynamic = 'force-dynamic';

export default async function PrintLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="raport-pdf-render" style={{ margin: 0, padding: 0, background: '#fff', minHeight: '100vh' }}>
      {children}
    </div>
  );
}
