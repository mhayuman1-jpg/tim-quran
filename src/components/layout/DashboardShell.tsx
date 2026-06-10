'use client';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { ToastProvider } from '@/lib/toast';
import { ViewModeProvider } from '@/hooks/useViewMode';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <ViewModeProvider>
      <ToastProvider>
        <div className="flex h-dvh overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100" style={{paddingTop: 'max(0px, env(safe-area-inset-top))'}}>
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-20 md:pb-0" style={{paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 5rem))'}}>{children}</main>
          </div>
        </div>
      </ToastProvider>
    </ViewModeProvider>
  );
}
