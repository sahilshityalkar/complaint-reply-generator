"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import ReplyCard from "./ReplyCard";
import UsageBadge from "./UsageBadge";
import UpgradeModal from "./UpgradeModal";
import EmailPromptModal from "./EmailPromptModal";

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
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string; is_default: boolean }>>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [customerEmail, setCustomerEmail] = useState("");
  const [sendingIndex, setSendingIndex] = useState<number | null>(null);
  const [sentIndices, setSentIndices] = useState<Set<number>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingSendIndex, setPendingSendIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/voice/profiles")
      .then((res) => res.json())
      .then((data) => {
        const list = data.profiles || [];
        setProfiles(list);
        const defaultProfile = list.find((p: typeof profiles[number]) => p.is_default);
        if (defaultProfile) setSelectedProfileId(defaultProfile.id);
      })
      .catch(() => {})
      .finally(() => setLoadingProfiles(false));
  }, []);

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
        body: JSON.stringify({ complaint, tone, bizType, profile_id: selectedProfileId || undefined }),
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

  async function handleSendEmail(replyIndex: number, email: string, subject: string) {
    const reply = replies[replyIndex];
    if (!reply) return;

    setSendingIndex(replyIndex);

    try {
      const businessName = profiles.find((p) => p.id === selectedProfileId)?.name || "";
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply_text: reply.text,
          customer_email: email,
          subject,
          business_name: businessName || bizType,
          reply_id: null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "email_limit_reached") {
          setShowUpgrade(true);
          toast.error("Email send limit reached for your plan.");
          return;
        }
        throw new Error(data.error || "Failed to send");
      }

      setSentIndices((prev) => new Set(prev).add(replyIndex));
      toast.success("Reply sent via email! ✉️");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send. Try again.");
    } finally {
      setSendingIndex(null);
      setPendingSendIndex(null);
      setShowEmailModal(false);
    }
  }

  async function handleSendClick(index: number) {
    if (customerEmail.trim()) {
      // Generate a subject from the complaint
      const defaultSubject = `Re: ${bizType} — regarding your recent message`;
      await handleSendEmail(index, customerEmail.trim(), defaultSubject);
    } else {
      setPendingSendIndex(index);
      setShowEmailModal(true);
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

        {/* Customer Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer email <span className="text-xs text-gray-400 font-normal">(optional — for sending replies)</span>
          </label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="angrycustomer@gmail.com"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
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

        {/* Brand Voice Profile */}
        {!loadingProfiles && profiles.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-gray-700">
              Brand Voice
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              <option value="">No brand voice (generic replies)</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.is_default ? "(default)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {profiles.length === 0 && !loadingProfiles && (
          <div className="text-center py-2">
            <Link
              href="/app/voice-setup"
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Set up your brand voice for better replies →
            </Link>
          </div>
        )}

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
              <ReplyCard
                key={i}
                reply={reply}
                onSendClick={() => handleSendClick(i)}
                sent={sentIndices.has(i)}
                sending={sendingIndex === i}
              />
            ))}
            {showEmailModal && pendingSendIndex !== null && (
              <EmailPromptModal
                onClose={() => { setShowEmailModal(false); setPendingSendIndex(null); }}
                onSend={async (email, subject) => {
                  await handleSendEmail(pendingSendIndex, email, subject);
                }}
                defaultSubject={`Re: ${bizType} — regarding your recent message`}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
