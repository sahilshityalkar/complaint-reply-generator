import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getUser, getUsage } from "@/lib/usage";
import { PLAN_LIMITS } from "@/lib/plans";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/Pagination";

interface Reply {
  label: string;
  tone: string;
  text: string;
}

interface HistoryItem {
  id: string;
  created_at: string;
  complaint: string;
  tone: string;
  business_type: string;
  replies: Reply[];
  sent_via_email?: boolean;
  customer_email?: string;
  email_subject?: string;
  sent_at?: string;
}

const PAGE_SIZE = 20;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tone?: string; biz?: string; page?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const params = await searchParams;
  const q = params.q?.trim() || "";
  const toneFilter = params.tone || "";
  const bizFilter = params.biz || "";
  const currentPage = Math.max(1, parseInt(params.page || "1"));
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [user, usage] = await Promise.all([
    getUser(userId),
    getUsage(userId),
  ]);

  // Build filtered query
  let query = supabase
    .from("reply_history")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  if (q) query = query.ilike("complaint", `%${q}%`);
  if (toneFilter) query = query.eq("tone", toneFilter);
  if (bizFilter) query = query.eq("business_type", bizFilter);

  const { data: history, count: totalCount } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // Get unique tones and business types for filter dropdowns
  const { data: allFilters } = await supabase
    .from("reply_history")
    .select("tone, business_type")
    .eq("user_id", userId);

  const uniqueTones = [...new Set(allFilters?.map((f) => f.tone) || [])].sort();
  const uniqueBizTypes = [
    ...new Set(allFilters?.map((f) => f.business_type) || []),
  ].sort();

  const plan = user?.plan ?? "free";
  const count = usage?.reply_count ?? 0;
  const limit = PLAN_LIMITS[plan];
  const isUnlimited = limit === -1;
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE));
  const hasActiveFilters = !!(q || toneFilter || bizFilter);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <Link
            href="/app"
            className="text-sm px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Generate replies
          </Link>
        </div>

        {/* Usage card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">This month</h2>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${
                plan === "pro"
                  ? "bg-black text-white"
                  : plan === "starter"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {plan}
            </span>
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-900">
              {isUnlimited ? "∞" : count}
              {!isUnlimited && (
                <span className="text-lg font-normal text-gray-400">
                  {" "}
                  / {limit} replies
                </span>
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {isUnlimited
                ? "Unlimited replies on Pro plan"
                : `${limit - count} replies remaining this month`}
            </p>
          </div>
          {!isUnlimited && (
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  count >= limit
                    ? "bg-red-500"
                    : count / limit >= 0.7
                      ? "bg-yellow-400"
                      : "bg-black"
                }`}
                style={{ width: `${Math.min((count / limit) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Reply history */}
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-gray-900">Reply history</h2>

          {/* Search bar */}
          <SearchBar
            availableTones={uniqueTones}
            availableBizTypes={uniqueBizTypes}
          />

          {/* Results state */}
          {!history || history.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-10 text-center text-gray-400 dark:text-gray-500 text-sm">
              {hasActiveFilters ? (
                <>
                  No results for &ldquo;{q}&rdquo;
                  {toneFilter && <> with tone &ldquo;{toneFilter}&rdquo;</>}
                  {bizFilter && <> in &ldquo;{bizFilter}&rdquo;</>}.
                  <br />
                  <Link
                    href="/dashboard"
                    className="text-black underline mt-1 inline-block"
                  >
                    Clear search and try again
                  </Link>
                </>
              ) : (
                <>
                  No history yet.{" "}
                  <Link href="/app" className="text-black underline">
                    Generate your first reply
                  </Link>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Result list */}
              <div className="flex flex-col gap-4">
                {(history as HistoryItem[]).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex flex-col gap-4"
                  >
                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                      <div className="flex items-center gap-2">
                        <span>
                          {item.business_type} · {item.tone} tone
                        </span>
                        {item.sent_via_email && (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            ✉️ Sent{" "}
                            {item.customer_email && `to ${item.customer_email}`}
                          </span>
                        )}
                      </div>
                      <span>
                        {new Date(item.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Complaint — highlight match */}
                    <p className="text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3">
                      &ldquo;
                      {q && item.complaint.toLowerCase().includes(q.toLowerCase())
                        ? (() => {
                            const highlighted = highlightMatch(item.complaint, q);
                            return (
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: highlighted,
                                }}
                              />
                            );
                          })()
                        : item.complaint.length > 120
                          ? item.complaint.slice(0, 120) + "…"
                          : item.complaint}
                      &rdquo;
                    </p>

                    {/* Replies */}
                    <div className="flex flex-col gap-2">
                      {item.replies.map((reply, i) => (
                        <ReplyRow key={i} reply={reply} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalResults={totalCount ?? 0}
                searchLabel={q || undefined}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function ReplyRow({ reply }: { reply: Reply }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{reply.label}</span>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{reply.text}</p>
    </div>
  );
}

/** Highlight search term in complaint text and show context around it */
function highlightMatch(text: string, query: string): string {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");

  // Find the first occurrence index
  const match = text.toLowerCase().indexOf(query.toLowerCase());
  if (match > -1) {
    // Trim context around the match
    const start = Math.max(0, match - 60);
    const end = Math.min(text.length, match + query.length + 80);
    const snippet = text.slice(start, end);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < text.length ? "…" : "";
    const highlighted = snippet.replace(
      regex,
      (m: string) => `<mark class="bg-yellow-200 rounded-sm px-0.5">${m}</mark>`
    );
    return `${prefix}${highlighted}${suffix}`;
  }

  return text.length > 120 ? text.slice(0, 120) + "…" : text;
}
