'use client';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { ToastProvider } from '@/lib/toast';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden" style={{background: '#f8fafc'}}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
