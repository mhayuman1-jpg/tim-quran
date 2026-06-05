// src/lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Tim Quran <noreply@timquran.id>';

export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  email: string;
  password: string;
  loginUrl: string;
}) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_placeholder')) {
    console.warn('[email] RESEND_API_KEY belum dikonfigurasi, skip kirim email.');
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Akun Tim Qur'an Anda Telah Dibuat`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#065f46">Selamat Datang di Tim Qur'an 👋</h2>
        <p>Halo <strong>${opts.name}</strong>,</p>
        <p>Akun Anda telah dibuat. Berikut detail login Anda:</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:4px 0"><strong>Email:</strong> ${opts.email}</p>
          <p style="margin:4px 0"><strong>Password:</strong> <code style="background:#d1fae5;padding:2px 6px;border-radius:4px">${opts.password}</code></p>
        </div>
        <p>Segera login dan ganti password Anda:</p>
        <a href="${opts.loginUrl}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Masuk ke Dashboard</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
      </div>
    `,
  });
}

export async function sendResetPasswordEmail(opts: {
  to: string;
  name: string;
  newPassword: string;
  loginUrl: string;
}) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_placeholder')) {
    console.warn('[email] RESEND_API_KEY belum dikonfigurasi, skip kirim email.');
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Reset Password Akun Tim Qur'an`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#065f46">Reset Password 🔐</h2>
        <p>Halo <strong>${opts.name}</strong>,</p>
        <p>Password akun Anda telah direset oleh Kabid. Password baru Anda:</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:4px 0"><strong>Password Baru:</strong> <code style="background:#d1fae5;padding:2px 6px;border-radius:4px">${opts.newPassword}</code></p>
        </div>
        <p>Segera login dan ganti password Anda:</p>
        <a href="${opts.loginUrl}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Masuk ke Dashboard</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Jika Anda tidak meminta reset password, hubungi Kabid segera.</p>
      </div>
    `,
  });
}
