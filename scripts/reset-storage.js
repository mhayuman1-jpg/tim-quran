#!/usr/bin/env node
/**
 * Script: Reset Tigris Storage bucket 'timquran-assets'
 * 
 * Fungsi:
 * 1. Hapus semua file di bucket 'timquran-assets'
 * 2. Upload file default (logo, avatar)
 * 3. Set key di database profil_website
 * 
 * Cara pakai:
 * node scripts/reset-storage.js
 * 
 * Requirement:
 * - .env.local harus punya: TIGRIS_STORAGE_ACCESS_KEY_ID, TIGRIS_STORAGE_SECRET_ACCESS_KEY
 * - .env.local harus punya: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (untuk database)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tigrisAccessKey = process.env.TIGRIS_STORAGE_ACCESS_KEY_ID;
const tigrisSecretKey = process.env.TIGRIS_STORAGE_SECRET_ACCESS_KEY;

if (!tigrisAccessKey || !tigrisSecretKey) {
  console.error('Error: TIGRIS_STORAGE_ACCESS_KEY_ID atau TIGRIS_STORAGE_SECRET_ACCESS_KEY tidak ada di .env.local');
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ada di .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://t3.storage.dev',
  credentials: {
    accessKeyId: tigrisAccessKey,
    secretAccessKey: tigrisSecretKey,
  },
});

const BUCKET = 'timquran-assets';
const LOGO_DIR = path.join(__dirname, '../public/default-assets');

/**
 * Step 1: Delete semua file di bucket 'timquran-assets'
 */
async function cleanBucket() {
  console.log(`\nStep 1: Membersihkan bucket '${BUCKET}'...`);
  
  try {
    const listCommand = new ListObjectsV2Command({ Bucket: BUCKET });
    const response = await s3.send(listCommand);

    if (!response.Contents || response.Contents.length === 0) {
      console.log('Bucket sudah kosong.');
      return;
    }

    const keys = response.Contents.filter(obj => obj.Key).map(obj => ({ Key: obj.Key }));
    console.log(`Found ${keys.length} files. Deleting...`);

    if (keys.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: keys },
      });
      await s3.send(deleteCommand);
      console.log(`${keys.length} file berhasil dihapus.`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

/**
 * Step 2: Upload file default (placeholder logo, avatar)
 */
async function uploadDefaults() {
  console.log(`\nStep 2: Upload file default ke bucket '${BUCKET}'...`);

  // Buat direktori jika belum ada
  if (!fs.existsSync(LOGO_DIR)) {
    fs.mkdirSync(LOGO_DIR, { recursive: true });
    console.log(`Direktori ${LOGO_DIR} dibuat.`);
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
    console.log(`Created ${logoPath}`);
  }

  if (!fs.existsSync(avatarPath)) {
    fs.writeFileSync(avatarPath, placeholderSvg);
    console.log(`Created ${avatarPath}`);
  }

  // Upload ke Tigris
  try {
    const logoContent = fs.readFileSync(logoPath);
    const logoCommand = new PutObjectCommand({
      Bucket: BUCKET,
      Key: 'logo/default.svg',
      Body: logoContent,
      ContentType: 'image/svg+xml',
    });
    await s3.send(logoCommand);
    console.log('logo/default.svg berhasil diupload.');

    const avatarContent = fs.readFileSync(avatarPath);
    const avatarCommand = new PutObjectCommand({
      Bucket: BUCKET,
      Key: 'avatar/default.svg',
      Body: avatarContent,
      ContentType: 'image/svg+xml',
    });
    await s3.send(avatarCommand);
    console.log('avatar/default.svg berhasil diupload.');
  } catch (err) {
    console.error('Error upload:', err.message);
  }
}

/**
 * Step 3: Update database dengan Tigris key baru
 */
async function updateDatabase() {
  console.log(`\nStep 3: Update database dengan Tigris key baru...`);

  // Simpan Tigris key (bukan URL) — presigned URL akan di-generate saat diperlukan
  const logoKey = 'logo/default.svg';

  try {
    const { error } = await supabase
      .from('profil_website')
      .update({
        logo_url: logoKey,
        logo_sekolah_url: logoKey,
        updated_at: new Date().toISOString(),
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error update database:', error.message);
    } else {
      console.log('Database profil_website berhasil diupdate.');
      console.log(`  Logo key: ${logoKey}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

/**
 * Main: Jalankan semua step
 */
async function main() {
  console.log('\n=====================================');
  console.log('Reset Tigris Storage - Assets');
  console.log('=====================================');
  console.log(`Bucket: ${BUCKET}`);

  await cleanBucket();
  await uploadDefaults();
  await updateDatabase();

  console.log('\nSelesai! Storage sudah di-reset dan dikonfigurasi ulang.\n');
  console.log('Langkah selanjutnya:');
  console.log('   1. Buka http://localhost:3000/dashboard/website');
  console.log('   2. Upload logo Tim Qur\'an dan Logo Sekolah via UI');
  console.log('   3. Verifikasi preview logo tampil di navbar');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
