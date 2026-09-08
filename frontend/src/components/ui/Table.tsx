import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  onRowClick,
  empty,
}: TableProps<T>) {
  if (data.length === 0 && empty) {
    return <div className="p-6">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((col) => (
              <th key={col.key} className={`table-header ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`table-cell ${col.className || ''}`}>
                  {col.render ? col.render(row) : (row[col.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
      <span className="text-slate-500">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
        >
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              p === page ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
