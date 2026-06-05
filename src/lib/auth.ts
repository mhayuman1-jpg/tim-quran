// src/lib/auth.ts
// Konfigurasi NextAuth — diekstrak dari route.ts agar bisa diimpor di API routes lain

import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { createServerClient } from './supabase/server';
import type { UserRole } from '@/types';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const supabase = createServerClient();

        // Ambil user dari tabel 'users'
        const { data: user, error } = await supabase
          .from('users')
          .select('id, email, name, role, status, password_hash')
          .eq('email', credentials.email)
          .single();

        if (error || !user) return null;

        // Tolak akun yang nonaktif
        if (user.status === 'Nonaktif') return null;

        // Verifikasi password dengan bcrypt
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Saat login pertama, user object tersedia — simpan id dan role ke token
      if (user) {
        token.id = user.id;
        token.role = user.role as UserRole;
      }
      return token;
    },
    async session({ session, token }) {
      // Salin id dan role dari token ke session.user
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 86400, // 24 jam
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
