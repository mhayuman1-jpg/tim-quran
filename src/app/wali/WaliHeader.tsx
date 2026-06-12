'use client';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, BookOpen, User, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function WaliHeader() {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/messages/unread-count');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count);
        }
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

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

      <div className="flex items-center gap-2">
        {/* Pesan button */}
        <Link href="/wali/pesan"
          className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
          <MessageCircle size={15} />
          <span className="hidden sm:inline">Pesan</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
              style={{ boxShadow: "0 2px 6px rgba(239,68,68,0.4)" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

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
