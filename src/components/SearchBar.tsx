"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

interface SearchBarProps {
  availableTones: string[];
  availableBizTypes: string[];
}

export default function SearchBar({ availableTones, availableBizTypes }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [tone, setTone] = useState(searchParams.get("tone") || "");
  const [biz, setBiz] = useState(searchParams.get("biz") || "");

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (tone) params.set("tone", tone);
    if (biz) params.set("biz", biz);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }, [q, tone, biz, pathname, router]);

  const handleClear = useCallback(() => {
    setQ("");
    setTone("");
    setBiz("");
    router.push(pathname);
  }, [pathname, router]);

  const hasFilters = q || tone || biz;

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search past complaints..."
          className="w-full px-4 py-2.5 pl-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          🔍
        </span>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black/10"
        >
          <option value="">All tones</option>
          {availableTones.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={biz}
          onChange={(e) => setBiz(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black/10"
        >
          <option value="">All business types</option>
          {availableBizTypes.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <button
          onClick={handleSearch}
          className="px-4 py-1.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Search
        </button>

        {hasFilters && (
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
