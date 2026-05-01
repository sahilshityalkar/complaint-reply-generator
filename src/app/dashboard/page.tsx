import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getUser, getUsage } from "@/lib/usage";
import { PLAN_LIMITS } from "@/lib/plans";

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

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user, usage, { data: history }] = await Promise.all([
    getUser(userId),
    getUsage(userId),
    supabase
      .from("reply_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const plan = user?.plan ?? "free";
  const count = usage?.reply_count ?? 0;
  const limit = PLAN_LIMITS[plan];
  const isUnlimited = limit === -1;

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <Link
            href="/app"
            className="text-sm px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Generate replies
          </Link>
        </div>

        {/* Usage card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">This month</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${
              plan === "pro"
                ? "bg-black text-white"
                : plan === "starter"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600"
            }`}>
              {plan}
            </span>
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-900">
              {isUnlimited ? "∞" : count}
              {!isUnlimited && (
                <span className="text-lg font-normal text-gray-400"> / {limit} replies</span>
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
                  count >= limit ? "bg-red-500" : count / limit >= 0.7 ? "bg-yellow-400" : "bg-black"
                }`}
                style={{ width: `${Math.min((count / limit) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Reply history */}
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-gray-900">
            Reply history
            <span className="ml-2 text-sm font-normal text-gray-400">
              last {history?.length ?? 0} generations
            </span>
          </h2>

          {!history || history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
              No history yet.{" "}
              <Link href="/app" className="text-black underline">
                Generate your first reply
              </Link>
            </div>
          ) : (
            (history as HistoryItem[]).map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4"
              >
                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <span>
                      {item.business_type} · {item.tone} tone
                    </span>
                    {item.sent_via_email && (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        ✉️ Sent {item.customer_email && `to ${item.customer_email}`}
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

                {/* Complaint */}
                <p className="text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3">
                  &ldquo;{item.complaint.length > 120
                    ? item.complaint.slice(0, 120) + "…"
                    : item.complaint}&rdquo;
                </p>

                {/* Replies */}
                <div className="flex flex-col gap-2">
                  {item.replies.map((reply, i) => (
                    <ReplyRow key={i} reply={reply} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

function ReplyRow({ reply }: { reply: Reply }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs font-semibold text-gray-400">{reply.label}</span>
      <p className="text-sm text-gray-700 leading-relaxed">{reply.text}</p>
    </div>
  );
}
