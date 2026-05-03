interface StatRow {
  name: string;
  count: number;
  pct: number;
}

function computeStats(items: Array<{ tone: string; business_type: string; created_at: string }>) {
  const toneMap = new Map<string, number>();
  const bizMap = new Map<string, number>();
  const monthMap = new Map<string, number>();
  let total = 0;

  for (const item of items) {
    total++;
    toneMap.set(item.tone, (toneMap.get(item.tone) || 0) + 1);
    bizMap.set(item.business_type, (bizMap.get(item.business_type) || 0) + 1);

    const month = item.created_at?.slice(0, 7); // "2026-04"
    if (month) monthMap.set(month, (monthMap.get(month) || 0) + 1);
  }

  function toSortedStats(map: Map<string, number>, max: number): StatRow[] {
    return [...map.entries()]
      .map(([name, count]) => ({ name, count, pct: total > 0 ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, max);
  }

  const months = [...monthMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(-6);

  return { toneStats: toSortedStats(toneMap, 5), bizStats: toSortedStats(bizMap, 5), months, total };
}

function StatBar({ stat, label, color }: { stat: StatRow; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 dark:text-gray-400 w-24 truncate shrink-0" title={stat.name}>
        {stat.name}
      </span>
      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.max(stat.pct, 4)}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right shrink-0">{stat.count}</span>
    </div>
  );
}

function MonthBar({ month, count, maxCount }: { month: string; count: number; maxCount: number }) {
  const label = new Date(month + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{count}</span>
      <div className="w-full h-20 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex items-end">
        <div
          className="w-full bg-gray-900 dark:bg-white rounded-full transition-all"
          style={{ height: `${Math.max(pct, 5)}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
    </div>
  );
}

export function StatsSection({
  items,
}: {
  items: Array<{ tone: string; business_type: string; created_at: string }>;
}) {
  const { toneStats, bizStats, months, total } = computeStats(items || []);

  if (total === 0) return null;

  const maxMonth = Math.max(...months.map((m) => m.count), 1);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Insights</h2>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total replies</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{months.length > 0 ? months[months.length - 1]?.count || 0 : 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This month</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{toneStats[0]?.name || "—"}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Top tone</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{bizStats[0]?.name || "—"}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Top business</p>
        </div>
      </div>

      {/* Monthly trend */}
      {months.length > 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Monthly trend
          </h3>
          <div className="flex items-end gap-2 h-28">
            {months.map((m) => (
              <MonthBar key={m.name} month={m.name} count={m.count} maxCount={maxMonth} />
            ))}
          </div>
        </div>
      )}

      {/* Tone distribution */}
      {toneStats.length > 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Tones used
          </h3>
          <div className="flex flex-col gap-2.5">
            {toneStats.map((s) => (
              <StatBar key={s.name} stat={s} label={s.name} color="bg-gray-900 dark:bg-white" />
            ))}
          </div>
        </div>
      )}

      {/* Business type distribution */}
      {bizStats.length > 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Business types
          </h3>
          <div className="flex flex-col gap-2.5">
            {bizStats.map((s) => (
              <StatBar key={s.name} stat={s} label={s.name} color="bg-gray-400 dark:bg-gray-400" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
