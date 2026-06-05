'use client';

// src/components/shared/ConfirmDialog.tsx
// Dialog konfirmasi dengan pesan, tombol Batal dan Konfirmasi.

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  /** Label tombol konfirmasi (default: "Konfirmasi") */
  confirmLabel?: string;
  /** Variant tombol konfirmasi (default: "danger") */
  confirmVariant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Label tombol batal (default: "Batal") */
  cancelLabel?: string;
  /** Tampilkan ikon peringatan (default: true) */
  showIcon?: boolean;
  /** Tombol konfirmasi dalam state loading */
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Konfirmasi',
  confirmVariant = 'danger',
  cancelLabel = 'Batal',
  showIcon = true,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnBackdrop={!loading}
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        {showIcon && (
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
        )}

        <div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
          <p className="text-sm text-slate-500">{message}</p>
        </div>

        <div className="flex gap-3 w-full pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
