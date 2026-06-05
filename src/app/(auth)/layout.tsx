// Layout minimal untuk halaman auth (login) — tanpa navbar publik
import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
