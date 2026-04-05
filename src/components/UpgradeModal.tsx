"use client";

import Link from "next/link";

export default function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full flex flex-col gap-5 shadow-xl">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-gray-900">
            You&apos;ve used all 10 free replies
          </h2>
          <p className="text-sm text-gray-500">
            Upgrade to keep replying. Starter gives you 100 replies/month.
            Pro is unlimited.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-4 rounded-xl border-2 border-black bg-black text-white">
            <div>
              <p className="font-semibold">Starter</p>
              <p className="text-xs text-gray-300">100 replies / month</p>
            </div>
            <span className="font-bold text-lg">$9/mo</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
            <div>
              <p className="font-semibold text-gray-900">Pro</p>
              <p className="text-xs text-gray-500">Unlimited replies</p>
            </div>
            <span className="font-bold text-lg text-gray-900">$19/mo</span>
          </div>
        </div>

        <p className="text-xs text-center text-gray-400">
          Payments coming soon. Join the waitlist to be notified.
        </p>

        <div className="flex flex-col gap-2">
          <Link
            href="/sign-up"
            className="w-full text-center py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Join waitlist
          </Link>
          <button
            onClick={onClose}
            className="w-full text-center py-3 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
