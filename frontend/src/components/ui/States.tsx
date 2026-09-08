import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: React.ElementType;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-risk-critical-bg">
        <Loader2 className="h-7 w-7 text-risk-critical" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Something went wrong</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-2">
          Try Again
        </button>
      )}
    </div>
  );
}
