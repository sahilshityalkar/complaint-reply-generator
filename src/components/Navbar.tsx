"use client";

import Link from "next/link";
import { UserButton, Show } from "@clerk/nextjs";

export default function Navbar() {
  return (
    <nav className="w-full border-b border-gray-100 bg-white px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-base font-bold text-gray-900">
          ReplyAI
        </Link>

        <div className="flex items-center gap-3">
          <Show when="signed-out">
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
          </Show>

          <Show when="signed-in">
            <Link
              href="/app"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Tool
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  );
}
