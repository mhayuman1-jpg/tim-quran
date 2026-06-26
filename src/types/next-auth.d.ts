// src/types/next-auth.d.ts
// Augment NextAuth types agar session.user.role dan token.role bertipe UserRole

import { UserRole } from './index';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      photo_url?: string | null;
      santri_id?: string;
      wali_nis?: string;
      username?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    photo_url?: string | null;
    santri_id?: string;
    wali_nis?: string;
    username?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    photo_url?: string | null;
    santri_id?: string;
    wali_nis?: string;
  }
}
