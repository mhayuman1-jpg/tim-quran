// src/hooks/useSession.ts
// Wrapper tipis di atas useSession next-auth dengan type yang sudah di-augment

import { useSession as useNextAuthSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { UserRole } from '@/types';

// Re-export tipe Session yang sudah di-augment agar konsumen tidak perlu import dari next-auth
export type { Session };

export interface UseSessionReturn {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  userId: string | undefined;
  userName: string | undefined;
  userEmail: string | undefined;
  userRole: UserRole | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Wrapper useSession dari next-auth.
 * Mengembalikan session dengan type yang sudah di-augment (role, id tersedia langsung).
 */
export function useSession(): UseSessionReturn {
  const { data: session, status } = useNextAuthSession();

  return {
    session,
    status,
    userId: session?.user?.id,
    userName: session?.user?.name,
    userEmail: session?.user?.email,
    userRole: session?.user?.role,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  };
}
