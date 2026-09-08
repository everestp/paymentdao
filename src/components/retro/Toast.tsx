import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Radio } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { cn } from '@/lib/utils';

export function ToastContainer() {
  const { toasts, removeToast } = useApp();
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ toast, onClose }: { toast: { id: string; title: string; description?: string; variant: string }; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);

  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle2 className="w-4 h-4 text-green" />,
    error: <AlertCircle className="w-4 h-4 text-red" />,
    info: <Info className="w-4 h-4 text-cyan" />,
    live: <Radio className="w-4 h-4 text-green" />,
  };
  const colors: Record<string, string> = { success: '#00e676', error: '#ff3860', info: '#00d4e6', live: '#00e676' };
  const color = colors[toast.variant] || '#00d4e6';

  return (
    <div className={cn('card p-4 pointer-events-auto transition-all', visible && 'animate-slide-in-right')} style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icons[toast.variant] || icons.info}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-txprim mb-0.5">{toast.title}</p>
          {toast.description && <p className="text-xs text-txsec">{toast.description}</p>}
        </div>
        <button onClick={onClose} className="text-txdim hover:text-txprim"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
