import React from 'react';
import { cn } from '../../lib/cn';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available.',
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-xl border border-white/[0.04] bg-[#0d1017] select-text shadow-sm", className)}>
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-[#0f1115] border-b border-white/[0.04] text-[11px] font-bold uppercase tracking-wider text-gray-400 select-none">
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx} className={cn("px-6 py-4 font-bold", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-gray-300">
          {loading ? (
            // Loading Skeletons
            Array.from({ length: 5 }).map((_, rIdx) => (
              <tr key={rIdx} className="hover:bg-dark-hover/30 animate-pulse">
                {columns.map((_, cIdx) => (
                  <td key={cIdx} className="px-6 py-5">
                    <div className="h-4 bg-dark-hover rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // Empty State
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center text-gray-500 select-none">
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            // Data Rows
            data.map((row, rIdx) => (
              <tr 
                key={rIdx} 
                className="hover:bg-[#121620]/40 transition-all duration-150 group"
              >
                {columns.map((col, cIdx) => (
                  <td 
                    key={col.key || cIdx} 
                    className={cn("px-6 py-4 align-middle leading-relaxed font-medium transition-all group-hover:text-gray-100", col.className)}
                  >
                    {col.render ? col.render(row, rIdx) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
