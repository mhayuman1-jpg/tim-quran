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
    // Provider untuk Wali Murid — login menggunakan NISN siswa tanpa password
    CredentialsProvider({
      id: 'wali-credentials',
      name: 'Wali Murid',
      credentials: {
        nis: { label: 'NIS', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.nis?.trim()) return null;

        const supabase = createServerClient();

        // Cari santri berdasarkan NISN
        const { data: santri, error } = await supabase
          .from('santri')
          .select('id, nisn, nama')
          .eq('nisn', credentials.nis.trim())
          .eq('status', 'Aktif')
          .single();

        if (error || !santri) return null;

        return {
          id: santri.id,
          email: '',
          name: `Wali ${santri.nama}`,
          role: 'Wali_Murid' as UserRole,
          photo_url: null,
          santri_id: santri.id,
          wali_nis: santri.nisn,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Saat login pertama, user object tersedia
        token.id = user.id;
        token.role = user.role as UserRole;
        token.photo_url = user.photo_url;
        token.name = user.name;
        // Untuk Wali_Murid, simpan data tambahan
        if (user.role === 'Wali_Murid') {
          token.santri_id = user.santri_id;
          token.wali_nis = user.wali_nis;
          return token;
        }
      }
      // Untuk role selain Wali_Murid, refresh data dari DB
      if (token.id && token.role !== 'Wali_Murid') {
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
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.photo_url = token.photo_url;
        session.user.name = token.name ?? session.user.name;
        // Sertakan data wali murid jika ada
        if (token.role === 'Wali_Murid') {
          session.user.santri_id = token.santri_id;
          session.user.wali_nis = token.wali_nis;
        }
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
