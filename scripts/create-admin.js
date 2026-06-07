#!/usr/bin/env node
/**
 * Script: Create an admin (Kabid) account in Supabase users table.
 *
 * Usage:
 *   node scripts/create-admin.js admin@example.com P@ssw0rd "Nama Admin"
 *
 * Requirements:
 *   - .env.local or environment must define NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - npm install @supabase/supabase-js bcryptjs dotenv
 */

const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan.');
  process.exit(1);
}

const [,, email, password, ...nameParts] = process.argv;
const name = nameParts.join(' ').trim() || 'Administrator';

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.js EMAIL PASSWORD "Nama Admin"');
  process.exit(1);
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email.trim())) {
  console.error('❌ Error: Format email tidak valid.');
  process.exit(1);
}

if (password.length < 6) {
  console.error('❌ Error: Password minimal 6 karakter.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const hashedPassword = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: hashedPassword,
        role: 'Kabid',
        status: 'Aktif',
      },
    ])
    .select('id, name, email, role, status, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      console.error('❌ Error: Email sudah terdaftar. Gunakan email lain atau cek akun yang ada.');
      process.exit(1);
    }
    console.error('❌ Error saat membuat akun admin:', error.message || error);
    process.exit(1);
  }

  console.log('✅ Akun admin berhasil dibuat:');
  console.log(`  id: ${data.id}`);
  console.log(`  name: ${data.name}`);
  console.log(`  email: ${data.email}`);
  console.log(`  role: ${data.role}`);
  console.log(`  status: ${data.status}`);
  console.log('Jangan lupa login menggunakan kredensial tersebut.');
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
