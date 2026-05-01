"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";

const NAV_ITEMS = [
  { href: "/app", label: "Generate", icon: "✨" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/app/voice-setup", label: "Brand Voice", icon: "🎤" },
];

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/build"];

export default function Sidebar() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  // Don't show sidebar on public pages
  if (PUBLIC_PATHS.includes(pathname)) return null;

  // Render a compact top nav if not signed in on protected pages
  if (!isSignedIn) {
    return (
      <nav className="w-full border-b border-gray-100 bg-white px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-base font-bold text-gray-900">
            ReplyAI
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // Full sidebar for authenticated users
  return (
    <aside className="w-56 min-h-screen border-r border-gray-100 bg-white flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-50">
        <Link href="/" className="text-lg font-bold text-gray-900">
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
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-gray-50 flex flex-col gap-3">
        {/* Plan badge */}
        <div className="px-3 py-2 rounded-xl bg-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Free Plan
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            10 replies / month
          </p>
        </div>

        {/* User */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-gray-400">Account</span>
          <UserButton />
        </div>
      </div>
    </aside>
  );
}
