// src/hooks/useRole.ts
// Hook yang mengembalikan role user dari session beserta helper isKabid() dan isTimQuran()

import { useSession } from './useSession';
import type { UserRole } from '@/types';

export interface UseRoleReturn {
  role: UserRole | undefined;
  isLoading: boolean;
  isKabid: () => boolean;
  isTimQuran: () => boolean;
}

/**
 * Hook untuk membaca role user dari session.
 * Menyediakan helper isKabid() dan isTimQuran() untuk pengecekan role yang mudah.
 *
 * @example
 * const { role, isKabid, isTimQuran } = useRole();
 * if (isKabid()) { ... }
 */
export function useRole(): UseRoleReturn {
  const { userRole, isLoading } = useSession();

  const isKabid = (): boolean => userRole === 'Kabid';
  const isTimQuran = (): boolean => userRole === 'Tim_Quran';

  return {
    role: userRole,
    isLoading,
    isKabid,
    isTimQuran,
  };
}
