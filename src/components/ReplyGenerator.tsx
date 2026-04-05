"use client";

import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import ReplyCard from "./ReplyCard";
import UsageBadge from "./UsageBadge";
import UpgradeModal from "./UpgradeModal";

const TONES = ["Empathetic", "Firm", "Apologetic", "Professional"];

const BIZ_TYPES = [
  "Etsy shop",
  "Shopify store",
  "Freelancer",
  "Restaurant",
  "SaaS product",
  "Other",
];

interface Reply {
  label: string;
  tone: string;
  text: string;
}

export default function ReplyGenerator() {
  const [complaint, setComplaint] = useState("");
  const [tone, setTone] = useState("Empathetic");
  const [bizType, setBizType] = useState("Etsy shop");
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [refreshBadge, setRefreshBadge] = useState(0);

  async function handleGenerate() {
    if (complaint.trim().length < 20) {
      toast.error("Please enter at least 20 characters.");
      return;
    }

    setReplies([]);
    setLoading(true);

    const toastId = toast.loading("Generating replies...");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaint, tone, bizType }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "limit_reached") {
          toast.dismiss(toastId);
          setShowUpgrade(true);
          return;
        }
        toast.error(data.error ?? "Something went wrong.", { id: toastId });
        return;
      }

      setReplies(data.replies);
      setRefreshBadge((n) => n + 1);
      toast.success("3 replies ready!", { id: toastId });
    } catch {
      toast.error("Network error. Check your connection.", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Toaster position="top-center" />
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        <UsageBadge key={refreshBadge} />

        {/* Complaint input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Paste the customer complaint
          </label>
          <textarea
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            placeholder="e.g. I ordered 3 weeks ago and still haven't received my package. This is completely unacceptable and I want a refund immediately!"
            rows={5}
            className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-black/10"
          />
          <p className={`text-xs text-right ${complaint.length < 20 && complaint.length > 0 ? "text-red-400" : "text-gray-400"}`}>
            {complaint.length} characters {complaint.length < 20 && complaint.length > 0 ? "(need 20+)" : ""}
          </p>
        </div>

        {/* Business type */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Business type</label>
          <div className="flex flex-wrap gap-2">
            {BIZ_TYPES.map((b) => (
              <button
                key={b}
                onClick={() => setBizType(b)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  bizType === b
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Tone selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Your preferred tone</label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  tone === t
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate 3 replies"}
        </button>

        {/* Results */}
        {replies.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-gray-500">
              3 replies ready — click Copy on the one you want to send
            </p>
            {replies.map((reply, i) => (
              <ReplyCard key={i} reply={reply} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
