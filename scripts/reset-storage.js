#!/usr/bin/env node
/**
 * Script: Reset Supabase Storage bucket 'assets'
 * 
 * Fungsi:
 * 1. Hapus semua file di bucket 'assets'
 * 2. Upload file default (logo, avatar)
 * 3. Set URL di database profil_website
 * 
 * Cara pakai:
 * node scripts/reset-storage.js
 * 
 * Requirement:
 * - .env.local harus punya: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * - npm install @supabase/supabase-js dotenv
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ada di .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET = 'assets';
const LOGO_DIR = path.join(__dirname, '../public/default-assets');

/**
 * Step 1: Delete semua file di bucket 'assets'
 */
async function cleanBucket() {
  console.log(`\n🗑️  Step 1: Membersihkan bucket '${BUCKET}'...`);
  
  try {
    const { data: objects, error: listError } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 1000 });

    if (listError) {
      console.warn('⚠️  Bucket mungkin kosong atau belum ada:', listError.message);
      return;
    }

    if (!objects || objects.length === 0) {
      console.log('✓ Bucket sudah kosong.');
      return;
    }

    console.log(`Found ${objects.length} files. Deleting...`);
    
    const filesToDelete = objects
      .filter(obj => obj.name) // Skip direktori
      .map(obj => obj.name);

    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from(BUCKET)
        .remove(filesToDelete);

      if (deleteError) {
        console.error('❌ Error saat menghapus:', deleteError.message);
      } else {
        console.log(`✓ ${filesToDelete.length} file berhasil dihapus.`);
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

/**
 * Step 2: Upload file default (placeholder logo, avatar)
 * Support multiple image formats: SVG, PNG, JPG, WebP, GIF
 */
async function uploadDefaults() {
  console.log(`\n📤 Step 2: Upload file default ke bucket '${BUCKET}'...`);

  // Buat direktori jika belum ada
  if (!fs.existsSync(LOGO_DIR)) {
    fs.mkdirSync(LOGO_DIR, { recursive: true });
    console.log(`✓ Direktori ${LOGO_DIR} dibuat.`);
  }

  // Buat placeholder image (simple SVG)
  const placeholderSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#f3f4f6"/>
  <circle cx="100" cy="80" r="40" fill="#10b981"/>
  <path d="M 60 140 Q 100 120 140 140 L 140 200 L 60 200 Z" fill="#10b981"/>
  <text x="100" y="175" font-size="16" fill="#fff" text-anchor="middle" font-family="Arial">Placeholder</text>
</svg>`;

  const logoPath = path.join(LOGO_DIR, 'logo-default.svg');
  const avatarPath = path.join(LOGO_DIR, 'avatar-default.svg');

  // Simpan placeholder files
  if (!fs.existsSync(logoPath)) {
    fs.writeFileSync(logoPath, placeholderSvg);
    console.log(`✓ Created ${logoPath}`);
  }

  if (!fs.existsSync(avatarPath)) {
    fs.writeFileSync(avatarPath, placeholderSvg);
    console.log(`✓ Created ${avatarPath}`);
  }

  // Upload ke Supabase
  try {
    const logoContent = fs.readFileSync(logoPath);
    const { error: logoError } = await supabase.storage
      .from(BUCKET)
      .upload('logo/default.svg', logoContent, {
        contentType: 'image/svg+xml',
        upsert: true,
      });

    if (logoError) {
      console.error(`❌ Error upload logo:`, logoError.message);
    } else {
      console.log(`✓ logo/default.svg berhasil diupload.`);
    }

    const avatarContent = fs.readFileSync(avatarPath);
    const { error: avatarError } = await supabase.storage
      .from(BUCKET)
      .upload('avatar/default.svg', avatarContent, {
        contentType: 'image/svg+xml',
        upsert: true,
      });

    if (avatarError) {
      console.error(`❌ Error upload avatar:`, avatarError.message);
    } else {
      console.log(`✓ avatar/default.svg berhasil diupload.`);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

/**
 * Utility: Get content type based on file extension
 */
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

/**
 * Step 3: Update database dengan URL baru
 */
async function updateDatabase() {
  console.log(`\n📝 Step 3: Update database dengan URL baru...`);

  const baseUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}`;
  const logoUrl = `${baseUrl}/logo/default.svg`;

  try {
    const { error } = await supabase
      .from('profil_website')
      .update({
        logo_url: logoUrl,
        logo_sekolah_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update semua rows

    if (error) {
      console.error(`❌ Error update database:`, error.message);
    } else {
      console.log(`✓ Database profil_website berhasil diupdate.`);
      console.log(`  Logo URL: ${logoUrl}`);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

/**
 * Main: Jalankan semua step
 */
async function main() {
  console.log('\n=====================================');
  console.log('🔧 Reset Supabase Storage - Assets');
  console.log('=====================================');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Bucket: ${BUCKET}`);

  await cleanBucket();
  await uploadDefaults();
  await updateDatabase();

  console.log('\n✅ Selesai! Storage sudah di-reset dan dikonfigurasi ulang.\n');
  console.log('📌 Langkah selanjutnya:');
  console.log('   1. Buka http://localhost:3000/dashboard/website');
  console.log('   2. Upload logo Tim Qur\'an dan Logo Sekolah via UI');
  console.log('   3. Verifikasi preview logo tampil di navbar');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
