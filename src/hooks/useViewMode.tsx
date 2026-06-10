'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserRole } from '@/types';

interface ViewModeContextValue {
  viewAsRole: UserRole | null;
  viewAsTeacherId: string | null;
  setViewAsRole: (role: UserRole | null) => void;
  setViewAsTeacherId: (teacherId: string | null) => void;
  getEffectiveRole: (actualRole: UserRole | undefined) => UserRole;
  isViewingAsOther: boolean;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);
const STORAGE_KEY = 'timquran-view-as-role';
const TEACHER_ID_KEY = 'timquran-view-as-teacher-id';

function readStoredViewMode(): UserRole | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'Tim_Quran') return stored;
  } catch {}
  return null;
}

function readStoredTeacherId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TEACHER_ID_KEY);
  } catch {}
  return null;
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewAsRole, setViewAsRoleState] = useState<UserRole | null>(null);
  const [viewAsTeacherId, setViewAsTeacherIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredViewMode();
    if (stored) {
      setViewAsRoleState(stored);
    }
    const teacherId = readStoredTeacherId();
    if (teacherId) {
      setViewAsTeacherIdState(teacherId);
    }
    setHydrated(true);
  }, []);

  const setViewAsRole = useCallback((role: UserRole | null) => {
    setViewAsRoleState(role);
    try {
      role ? localStorage.setItem(STORAGE_KEY, role) : localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const setViewAsTeacherId = useCallback((teacherId: string | null) => {
    setViewAsTeacherIdState(teacherId);
    try {
      teacherId ? localStorage.setItem(TEACHER_ID_KEY, teacherId) : localStorage.removeItem(TEACHER_ID_KEY);
    } catch {}
  }, []);

  const getEffectiveRole = useCallback((actualRole: UserRole | undefined): UserRole => {
    return viewAsRole ?? actualRole ?? 'Tim_Quran';
  }, [viewAsRole]);

  return (
    <ViewModeContext.Provider value={{
      viewAsRole,
      viewAsTeacherId,
      setViewAsRole,
      setViewAsTeacherId,
      getEffectiveRole,
      isViewingAsOther: viewAsRole !== null,
    }}>
      {hydrated ? children : null}
    </ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    return {
      viewAsRole: null,
      viewAsTeacherId: null,
      setViewAsRole: () => {},
      setViewAsTeacherId: () => {},
      getEffectiveRole: (r) => r ?? 'Tim_Quran',
      isViewingAsOther: false,
    };
  }
  return ctx;
}
