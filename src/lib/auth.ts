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

        // Prefer RPC-based verification using pgcrypto if available.
        try {
          const { data, error } = await supabase.rpc('auth_user', {
            p_email: credentials.email,
            p_password: credentials.password,
          });

          if (!error && Array.isArray(data) && data.length > 0) {
            const user = data[0] as any;
            if (user.status === 'Nonaktif') return null;
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role as UserRole,
              photo_url: user.photo_url ?? null,
            };
          }
        } catch (err) {
          // ignore and fallback to bcrypt verification below
          console.warn('auth.rpc failed, falling back to bcrypt verification', err);
        }

        // Fallback: fetch user and compare bcrypt hash (for deployments that store bcrypt hashes)
        const { data: user, error } = await supabase
          .from('users')
          .select('id, email, name, role, status, password_hash, photo_url')
          .eq('email', credentials.email)
          .single();

        if (error || !user) return null;
        if (user.status === 'Nonaktif') return null;

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
          photo_url: user.photo_url ?? null,
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
        token.photo_url = user.photo_url;
        token.name = user.name;
      } else if (token.id) {
        const supabase = createServerClient();
        const { data, error } = await supabase
          .from('users')
          .select('id, name, role, photo_url')
          .eq('id', token.id)
          .single();

        if (!error && data) {
          token.role = data.role as UserRole;
          token.photo_url = data.photo_url;
          token.name = data.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Salin id, role, nama, dan photo_url dari token ke session.user
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.photo_url = token.photo_url;
        session.user.name = token.name ?? session.user.name;
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
