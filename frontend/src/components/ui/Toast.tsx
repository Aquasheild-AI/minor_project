import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  show: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, show, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3 rounded-lg border border-risk-low/20 bg-white px-4 py-3 shadow-lg">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-risk-low-bg">
          <CheckCircle2 className="h-5 w-5 text-risk-low" />
        </div>
        <p className="text-sm font-medium text-slate-800">{message}</p>
        <button onClick={onClose} className="ml-2 rounded p-0.5 text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
