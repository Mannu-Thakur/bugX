import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../button/Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-4 select-none">
      {/* Small Screen Layout */}
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || disabled}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || disabled}
        >
          Next
        </Button>
      </div>

      {/* Large Screen Layout */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-gray-500">
            Showing page <span className="font-semibold text-gray-400">{currentPage}</span> of{' '}
            <span className="font-semibold text-gray-400">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            {/* Prev Button */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || disabled}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-500 ring-1 ring-inset ring-dark-border hover:bg-dark-hover hover:text-gray-300 focus:z-20 focus:outline-offset-0 disabled:opacity-30 disabled:pointer-events-none"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Render direct page numbers or current ranges if needed */}
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pNum = idx + 1;
              const isCurrent = pNum === currentPage;
              
              return (
                <button
                  key={pNum}
                  onClick={() => onPageChange(pNum)}
                  disabled={disabled}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(
                    "relative inline-flex items-center px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ring-dark-border transition-colors duration-100",
                    isCurrent
                      ? "z-10 bg-blue-600 text-white ring-blue-500"
                      : "text-gray-400 hover:bg-dark-hover hover:text-gray-200"
                  )}
                >
                  {pNum}
                </button>
              );
            })}

            {/* Next Button */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || disabled}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-500 ring-1 ring-inset ring-dark-border hover:bg-dark-hover hover:text-gray-300 focus:z-20 focus:outline-offset-0 disabled:opacity-30 disabled:pointer-events-none"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};
