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
    <div className={cn("w-full overflow-x-auto rounded-lg border border-dark-border bg-dark-panel select-text", className)}>
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-[#101013] border-b border-dark-border text-xs font-semibold uppercase tracking-wider text-gray-500 select-none">
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx} className={cn("px-6 py-3.5 font-semibold", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-border text-gray-300">
          {loading ? (
            // Loading Skeletons
            Array.from({ length: 5 }).map((_, rIdx) => (
              <tr key={rIdx} className="hover:bg-dark-hover/30 animate-pulse">
                {columns.map((_, cIdx) => (
                  <td key={cIdx} className="px-6 py-4">
                    <div className="h-4 bg-dark-hover rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // Empty State
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500 select-none">
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
                className="hover:bg-dark-hover/50 transition-colors duration-100 group"
              >
                {columns.map((col, cIdx) => (
                  <td 
                    key={col.key || cIdx} 
                    className={cn("px-6 py-3.5 align-middle leading-normal", col.className)}
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
