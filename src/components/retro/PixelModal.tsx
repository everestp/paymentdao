import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function PixelModal({ open, onClose, title, description, children, className }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn('card max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto rounded-2xl', className)}
        style={{ background: '#12141b', border: '1px solid #3a3f55' }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-heading font-semibold text-txprim">{title}</DialogTitle>
          {description && <DialogDescription className="text-sm text-txsec">{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'primary' | 'green' | 'red';
  children?: ReactNode;
  loading?: boolean;
}

export function ConfirmModal({ open, onClose, onConfirm, title, description, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary', children, loading }: ConfirmModalProps) {
  const cls = cn('btn', variant === 'primary' && 'btn-primary', variant === 'green' && 'btn-green', variant === 'red' && 'btn-red');
  return (
    <PixelModal open={open} onClose={onClose} title={title} description={description}>
      {children}
      <div className="flex gap-3 justify-end mt-6">
        <button className="btn btn-ghost" onClick={onClose} disabled={loading}>{cancelText}</button>
        <button className={cls} onClick={onConfirm} disabled={loading}>
          {loading ? <><span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full spin" /> Processing...</> : confirmText}
        </button>
      </div>
    </PixelModal>
  );
}
