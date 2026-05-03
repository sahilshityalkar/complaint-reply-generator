"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import ReplyCard from "./ReplyCard";
import UsageBadge from "./UsageBadge";
import UpgradeModal from "./UpgradeModal";
import EmailPromptModal from "./EmailPromptModal";

// Default options (always shown)
const DEFAULT_TONES = ["Empathetic", "Firm", "Apologetic", "Professional"];
const DEFAULT_BIZ_TYPES = [
  "Etsy shop",
  "Shopify store",
  "Freelancer",
  "Restaurant",
  "SaaS product",
  "Other",
];

const REPLY_LENGTHS = [
  { value: "short", label: "Short", desc: "2-3 sentences" },
  { value: "medium", label: "Medium", desc: "3-5 sentences" },
  { value: "long", label: "Long", desc: "6-10 sentences" },
] as const;

const BUILTIN_LANGUAGES = [
  { value: "auto", label: "Auto" },
  { value: "hinglish", label: "Hinglish" },
  { value: "hindi", label: "Hindi" },
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
  { value: "marathi", label: "Marathi" },
  { value: "bengali", label: "Bengali" },
] as const;

interface Reply {
  label: string;
  tone: string;
  text: string;
}

export default function ReplyGenerator() {
  const [complaint, setComplaint] = useState("");
  const [tone, setTone] = useState("Empathetic");
  const [bizType, setBizType] = useState("Etsy shop");
  const [replyLength, setReplyLength] = useState<"short" | "medium" | "long">("medium");
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

  // Custom options state
  const [customTones, setCustomTones] = useState<string[]>([]);
  const [customBizTypes, setCustomBizTypes] = useState<string[]>([]);
  const [newToneInput, setNewToneInput] = useState("");
  const [newBizTypeInput, setNewBizTypeInput] = useState("");
  const [addingTone, setAddingTone] = useState(false);
  const [addingBizType, setAddingBizType] = useState(false);

  // Language state
  const [language, setLanguage] = useState("auto");
  const [customLanguages, setCustomLanguages] = useState<string[]>([]);
  const [newLanguageInput, setNewLanguageInput] = useState("");
  const [addingLanguage, setAddingLanguage] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<
    Array<{ id: string; name: string; reply_text: string; tone: string; biz_type: string; created_at: string }>
  >([]);
  const [savingTemplateIndex, setSavingTemplateIndex] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState("");

  // Fetch profiles and custom options on mount
  useEffect(() => {
    fetch("/api/voice/profiles")
      .then((res) => res.json())
      .then((data) => {
        const list = data.profiles || [];
        setProfiles(list);
        const defaultProfile = list.find((p: typeof list[0]) => p.is_default);
        if (defaultProfile) setSelectedProfileId(defaultProfile.id);
      })
      .catch(() => {})
      .finally(() => setLoadingProfiles(false));

    fetch("/api/user/options")
      .then((res) => res.json())
      .then((data) => {
        setCustomTones(data.custom_tones || []);
        setCustomBizTypes(data.custom_biz_types || []);
        setCustomLanguages(data.custom_languages || []);
        // Restore last used language if available
        if (data.last_language) {
          setLanguage(data.last_language);
        }
      })
      .catch(() => {});

    fetch("/api/user/templates")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data.templates || []);
      })
      .catch(() => {});
  }, []);

  // Save language preference when it changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Skip saving if still "auto" (default) — only save explicit selections
      if (language !== "auto") {
        fetch("/api/user/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "preference",
            action: "set-last-language",
            value: language,
          }),
        }).catch(() => {});
      }
    }, 1000); // 1-second debounce — don't save on rapid clicks
    return () => clearTimeout(timer);
  }, [language]);

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
        body: JSON.stringify({
          complaint,
          tone,
          bizType,
          replyLength,
          language: language === "auto" ? undefined : language,
          profile_id: selectedProfileId || undefined,
        }),
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
      const defaultSubject = `Re: ${bizType} — regarding your recent message`;
      await handleSendEmail(index, customerEmail.trim(), defaultSubject);
    } else {
      setPendingSendIndex(index);
      setShowEmailModal(true);
    }
  }

  // Custom options handlers
  async function handleAddTone() {
    const name = newToneInput.trim();
    if (!name) return;
    if (customTones.includes(name) || DEFAULT_TONES.includes(name)) {
      toast.error("This tone already exists.");
      return;
    }

    try {
      const res = await fetch("/api/user/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tone", action: "add", value: name }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomTones(data.items);
        setNewToneInput("");
        setAddingTone(false);
        toast.success(`Added custom tone: "${name}"`);
      } else {
        toast.error(data.error || "Failed to add tone.");
      }
    } catch {
      toast.error("Failed to save custom tone.");
    }
  }

  async function handleRemoveTone(name: string) {
    try {
      const res = await fetch("/api/user/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tone", action: "remove", value: name }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomTones(data.items);
        if (tone === name) setTone(DEFAULT_TONES[0]);
        toast(`Removed tone: "${name}"`);
      }
    } catch {
      toast.error("Failed to remove tone.");
    }
  }

  async function handleAddBizType() {
    const name = newBizTypeInput.trim();
    if (!name) return;
    if (customBizTypes.includes(name) || DEFAULT_BIZ_TYPES.includes(name)) {
      toast.error("This business type already exists.");
      return;
    }

    try {
      const res = await fetch("/api/user/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "biz-type", action: "add", value: name }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomBizTypes(data.items);
        setNewBizTypeInput("");
        setAddingBizType(false);
        toast.success(`Added custom business type: "${name}"`);
      } else {
        toast.error(data.error || "Failed to add business type.");
      }
    } catch {
      toast.error("Failed to save custom business type.");
    }
  }

  async function handleRemoveBizType(name: string) {
    try {
      const res = await fetch("/api/user/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "biz-type", action: "remove", value: name }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomBizTypes(data.items);
        if (bizType === name) setBizType(DEFAULT_BIZ_TYPES[0]);
        toast(`Removed business type: "${name}"`);
      }
    } catch {
      toast.error("Failed to remove business type.");
    }
  }

  // Language handlers
  async function handleAddLanguage() {
    const name = newLanguageInput.trim();
    if (!name) return;
    if (customLanguages.includes(name)) {
      toast.error("This language already exists.");
      return;
    }

    try {
      const res = await fetch("/api/user/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "language", action: "add", value: name }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomLanguages(data.items);
        setNewLanguageInput("");
        setAddingLanguage(false);
        toast.success(`Added custom language: "${name}"`);
      } else {
        toast.error(data.error || "Failed to add language.");
      }
    } catch {
      toast.error("Failed to save custom language.");
    }
  }

  async function handleRemoveLanguage(name: string) {
    try {
      const res = await fetch("/api/user/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "language", action: "remove", value: name }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomLanguages(data.items);
        if (language === name) setLanguage("auto");
        toast(`Removed language: "${name}"`);
      }
    } catch {
      toast.error("Failed to remove language.");
    }
  }

  // Template handlers
  async function handleSaveTemplate(index: number) {
    const reply = replies[index];
    if (!reply) return;
    const name = templateName.trim() || reply.label;
    try {
      const res = await fetch("/api/user/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          value: {
            name,
            reply_text: reply.text,
            tone: reply.tone,
            biz_type: bizType,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
        setSavingTemplateIndex(null);
        setTemplateName("");
        toast.success(`Saved template: "${name}"`);
      }
    } catch {
      toast.error("Failed to save template.");
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    try {
      const res = await fetch("/api/user/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", value: { id: templateId } }),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
        toast("Template deleted");
      }
    } catch {
      toast.error("Failed to delete template.");
    }
  }

  async function handleUseTemplate(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Template copied to clipboard!");
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
            {DEFAULT_BIZ_TYPES.map((b) => (
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
          {/* Custom business types */}
          {customBizTypes.length > 0 && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <div className="flex flex-wrap gap-2">
                {customBizTypes.map((b) => (
                  <div key={b} className="flex items-center gap-1">
                    <button
                      onClick={() => setBizType(b)}
                      className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                        bizType === b
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {b}
                    </button>
                    <button
                      onClick={() => handleRemoveBizType(b)}
                      className="text-gray-400 hover:text-red-500 transition-colors text-xs px-1"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Add custom business type */}
          {addingBizType ? (
            <div className="flex gap-2 items-center mt-1">
              <input
                type="text"
                value={newBizTypeInput}
                onChange={(e) => setNewBizTypeInput(e.target.value)}
                placeholder="e.g. Consulting Agency"
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                onKeyDown={(e) => e.key === "Enter" && handleAddBizType()}
                autoFocus
              />
              <button
                onClick={handleAddBizType}
                className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium"
              >
                Add
              </button>
              <button
                onClick={() => { setAddingBizType(false); setNewBizTypeInput(""); }}
                className="px-3 py-1.5 rounded-lg text-gray-500 text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingBizType(true)}
              className="self-start text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              + Add custom business type
            </button>
          )}
        </div>

        {/* Tone selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Your preferred tone</label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_TONES.map((t) => (
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
          {/* Custom tones */}
          {customTones.length > 0 && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <div className="flex flex-wrap gap-2">
                {customTones.map((t) => (
                  <div key={t} className="flex items-center gap-1">
                    <button
                      onClick={() => setTone(t)}
                      className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                        tone === t
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {t}
                    </button>
                    <button
                      onClick={() => handleRemoveTone(t)}
                      className="text-gray-400 hover:text-red-500 transition-colors text-xs px-1"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Add custom tone */}
          {addingTone ? (
            <div className="flex gap-2 items-center mt-1">
              <input
                type="text"
                value={newToneInput}
                onChange={(e) => setNewToneInput(e.target.value)}
                placeholder="e.g. Warm & Humorous"
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                onKeyDown={(e) => e.key === "Enter" && handleAddTone()}
                autoFocus
              />
              <button
                onClick={handleAddTone}
                className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium"
              >
                Add
              </button>
              <button
                onClick={() => { setAddingTone(false); setNewToneInput(""); }}
                className="px-3 py-1.5 rounded-lg text-gray-500 text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingTone(true)}
              className="self-start text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              + Add custom tone
            </button>
          )}
        </div>

        {/* Language selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Reply language
            {language === "auto" && (
              <span className="ml-2 text-xs text-gray-400 font-normal">
                ✨ Auto: matches the complaint&apos;s language
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {BUILTIN_LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  language === lang.value
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          {/* Custom languages */}
          {customLanguages.length > 0 && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <div className="flex flex-wrap gap-2">
                {customLanguages.map((lang) => (
                  <div key={lang} className="flex items-center gap-1">
                    <button
                      onClick={() => setLanguage(lang)}
                      className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                        language === lang
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {lang}
                    </button>
                    <button
                      onClick={() => handleRemoveLanguage(lang)}
                      className="text-gray-400 hover:text-red-500 transition-colors text-xs px-1"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Add custom language */}
          {addingLanguage ? (
            <div className="flex gap-2 items-center mt-1">
              <input
                type="text"
                value={newLanguageInput}
                onChange={(e) => setNewLanguageInput(e.target.value)}
                placeholder="e.g. Punjabi"
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                onKeyDown={(e) => e.key === "Enter" && handleAddLanguage()}
                autoFocus
              />
              <button
                onClick={handleAddLanguage}
                className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium"
              >
                Add
              </button>
              <button
                onClick={() => { setAddingLanguage(false); setNewLanguageInput(""); }}
                className="px-3 py-1.5 rounded-lg text-gray-500 text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingLanguage(true)}
              className="self-start text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              + Add custom language
            </button>
          )}
        </div>

        {/* Reply length */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Reply length</label>
          <div className="flex gap-1.5">
            {REPLY_LENGTHS.map((rl) => (
              <button
                key={rl.value}
                onClick={() => setReplyLength(rl.value)}
                className={`flex-1 py-2.5 rounded-xl text-sm border transition-colors ${
                  replyLength === rl.value
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                <span className="font-medium">{rl.label}</span>
                <span className="block text-[10px] opacity-70">{rl.desc}</span>
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

        {/* Saved Templates */}
        {templates.length > 0 && (
          <div className="flex flex-col gap-3">
            <details className="group">
              <summary className="text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700 transition-colors list-none flex items-center gap-2">
                <span className="text-xs transition-transform group-open:rotate-90">▶</span>
                Saved Templates ({templates.length})
              </summary>
              <div className="flex flex-col gap-2 mt-3">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-2 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">{t.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUseTemplate(t.reply_text)}
                          className="text-xs px-3 py-1 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="text-xs px-2 py-1 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete template"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {t.tone && `${t.tone} tone`}{t.tone && t.biz_type ? " · " : ""}{t.biz_type || ""}
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                      {t.reply_text}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* Results */}
        {replies.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-gray-500">
              3 replies ready — click Copy on the one you want to send
            </p>
            {replies.map((reply, i) => (
              <div key={i}>
                {savingTemplateIndex === i && (
                  <div className="flex gap-2 items-center mb-2 bg-gray-50 rounded-xl p-3">
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name (e.g. Late delivery apology)"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate(i)}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveTemplate(i)}
                      className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setSavingTemplateIndex(null); setTemplateName(""); }}
                      className="px-3 py-1.5 rounded-lg text-gray-500 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <ReplyCard
                  key={i}
                  reply={reply}
                  onSendClick={() => handleSendClick(i)}
                  onSaveTemplate={() => { setTemplateName(reply.label); setSavingTemplateIndex(i); }}
                  sent={sentIndices.has(i)}
                  sending={sendingIndex === i}
                />
              </div>
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
