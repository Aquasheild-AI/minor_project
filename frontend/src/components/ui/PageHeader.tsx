import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {breadcrumb && (
          <nav className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
            {breadcrumb.map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-slate-300">/</span>}
                <span className={i === breadcrumb.length - 1 ? 'font-medium text-slate-600' : ''}>{item}</span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
