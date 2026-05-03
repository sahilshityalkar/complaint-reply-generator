"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  searchLabel?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalResults,
  searchLabel,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (totalPages === 0) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Results count */}
      <p className="text-xs text-gray-400">
        {searchLabel ? (
          <>Showing {totalResults} results for &ldquo;{searchLabel}&rdquo;</>
        ) : (
          <>{totalResults} total entries</>
        )}
      </p>

      {/* Pagination buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-4 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>

          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-4 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
