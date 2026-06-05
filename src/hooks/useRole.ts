// src/hooks/useRole.ts
// Hook yang mengembalikan role user dari session beserta helper per role

import { useSession } from './useSession';
import type { UserRole } from '@/types';

export interface UseRoleReturn {
  role: UserRole | undefined;
  isLoading: boolean;
  isKabid: () => boolean;
  isTimQuran: () => boolean;
  isSekretaris: () => boolean;
  /** Kabid atau Sekretaris — punya akses manajemen konten */
  isManajemen: () => boolean;
}

export function useRole(): UseRoleReturn {
  const { userRole, isLoading } = useSession();

  const isKabid = (): boolean => userRole === 'Kabid';
  const isTimQuran = (): boolean => userRole === 'Tim_Quran';
  const isSekretaris = (): boolean => userRole === 'Sekretaris';
  const isManajemen = (): boolean => userRole === 'Kabid' || userRole === 'Sekretaris';

  return {
    role: userRole,
    isLoading,
    isKabid,
    isTimQuran,
    isSekretaris,
    isManajemen,
  };
}
