"use client";

import { useEffect, useState } from "react";

interface UsageData {
  count: number;
  limit: number;
  plan: string;
}

export default function UsageBadge() {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => null);
  }, []);

  if (!usage) return null;

  const isUnlimited = usage.limit === -1;
  const pct = isUnlimited ? 0 : (usage.count / usage.limit) * 100;
  const isNearLimit = !isUnlimited && pct >= 70;
  const isAtLimit = !isUnlimited && usage.count >= usage.limit;

  return (
    <div className={`flex flex-col gap-1.5 p-3 rounded-xl border text-sm ${
      isAtLimit
        ? "border-red-200 bg-red-50"
        : isNearLimit
        ? "border-yellow-200 bg-yellow-50"
        : "border-gray-100 bg-gray-50"
    }`}>
      <div className="flex items-center justify-between">
        <span className={`font-medium ${isAtLimit ? "text-red-700" : isNearLimit ? "text-yellow-700" : "text-gray-600"}`}>
          {isUnlimited
            ? "Unlimited replies"
            : `${usage.count} / ${usage.limit} replies used this month`}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${
          usage.plan === "pro"
            ? "bg-black text-white"
            : usage.plan === "starter"
            ? "bg-blue-100 text-blue-700"
            : "bg-gray-200 text-gray-600"
        }`}>
          {usage.plan}
        </span>
      </div>
      {!isUnlimited && (
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isAtLimit ? "bg-red-500" : isNearLimit ? "bg-yellow-400" : "bg-black"
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
