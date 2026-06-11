'use client';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, BookOpen, User } from 'lucide-react';
import Link from 'next/link';

export default function WaliHeader() {
  const { data: session } = useSession();

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 shrink-0"
      style={{borderBottom: '1px solid rgba(16,185,129,0.2)', background: 'rgba(255,255,255,0.95)'}}>
      <Link href="/wali/dashboard" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{background: 'linear-gradient(135deg, #059669, #10b981)'}}>
          <BookOpen size={15} className="text-white" />
        </div>
        <span className="font-bold text-slate-900 text-sm">Portal Wali Murid</span>
      </Link>

      <div className="flex items-center gap-3">
        {session?.user?.name && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
            <User size={14} className="text-emerald-500" />
            <span>{session.user.name}</span>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/wali/login' })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          style={{minHeight: '36px'}}>
          <LogOut size={15} />
          Keluar
        </button>
      </div>
    </header>
  );
}
