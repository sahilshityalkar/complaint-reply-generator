"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/app", label: "Generate", icon: "✨" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/app/voice-setup", label: "Brand Voice", icon: "🎤" },
];

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/build"];

export default function Sidebar() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const [dark, setDark] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("replyai-theme");
      const isDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
      setDark(isDark);
    } catch {}
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("replyai-theme", next ? "dark" : "light");
    } catch {}
  }

  // Don't show sidebar on public pages
  if (PUBLIC_PATHS.includes(pathname)) return null;

  // Compact top nav if not signed in
  if (!isSignedIn) {
    return (
      <nav className="w-full border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-base font-bold text-gray-900 dark:text-white">
            ReplyAI
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors px-2">
              {dark ? "☀️" : "🌙"}
            </button>
            <Link
              href="/sign-in"
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <aside className="w-56 min-h-screen border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col flex-shrink-0 transition-colors duration-200">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-50 dark:border-gray-800">
        <Link href="/" className="text-lg font-bold text-gray-900 dark:text-white">
          ReplyAI
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-gray-50 dark:border-gray-800 flex flex-col gap-3">
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span>{dark ? "☀️" : "🌙"}</span>
          <span>{dark ? "Light mode" : "Dark mode"}</span>
        </button>

        {/* Plan badge */}
        <div className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Free Plan
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            10 replies / month
          </p>
        </div>

        {/* User */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-gray-400 dark:text-gray-500">Account</span>
          <UserButton />
        </div>
      </div>
    </aside>
  );
}
