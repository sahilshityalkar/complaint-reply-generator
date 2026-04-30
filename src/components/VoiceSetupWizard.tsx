"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const METHODS = [
  { id: "url", label: "Paste my website", desc: "We'll analyze your site to learn your brand voice. Takes 10 seconds.", icon: "🌐" },
  { id: "quiz", label: "Quick setup quiz", desc: "Answer 4 easy questions. Works without a website.", icon: "✏️" },
  { id: "template", label: "Pick a template", desc: "Choose from pre-built industry templates.", icon: "📋" },
  { id: "manual", label: "Write it myself", desc: "Describe your brand voice in your own words.", icon: "📝" },
];

const INDUSTRIES = [
  "ecommerce", "restaurant", "freelancer", "healthcare",
  "saas", "local_business", "real_estate", "education", "other"
];

const KEYWORDS = [
  "warm", "friendly", "professional", "direct", "casual",
  "premium", "empathetic", "formal", "playful", "supportive"
];

export default function VoiceSetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<"method" | "details" | "generating" | "review">("method");
  const [method, setMethod] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("ecommerce");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [formality, setFormality] = useState("casual");
  const [emojiStyle, setEmojiStyle] = useState("occasional");
  const [manualVoice, setManualVoice] = useState("");

  const [generatedDna, setGeneratedDna] = useState("");
  const [signOff, setSignOff] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  };

  const handleGenerate = async () => {
    setStep("generating");

    try {
      if (method === "url") {
        const res = await fetch("/api/voice/generate-dna", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "url",
            website_url: websiteUrl,
            business_name: businessName,
            industry,
          }),
        });
        if (!res.ok) throw new Error("Generation failed");
        const data = await res.json();
        setGeneratedDna(data.voice_dna);
        setSignOff(`- ${businessName} Team`);
      } else if (method === "quiz") {
        const res = await fetch("/api/voice/generate-dna", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "quiz",
            business_name: businessName,
            industry,
            keywords: selectedKeywords,
            formality,
            emojiStyle,
          }),
        });
        if (!res.ok) throw new Error("Generation failed");
        const data = await res.json();
        setGeneratedDna(data.voice_dna);
        setSignOff(`- ${businessName} Team`);
      } else if (method === "template") {
        setGeneratedDna(`Professional and approachable ${industry} business. Uses industry-appropriate language. Solution-focused and helpful.`);
        setSignOff(`- ${businessName}`);
      } else {
        setGeneratedDna(manualVoice);
      }

      setStep("review");
    } catch {
      toast.error("Failed to generate voice. Please try again.");
      setStep("details");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/voice/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || businessName,
          business_name: businessName,
          industry,
          website_url: method === "url" ? websiteUrl : undefined,
          voice_dna: generatedDna,
          sign_off: signOff || undefined,
          setup_method: method,
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();

      // Set as default
      await fetch(`/api/voice/profiles/${data.profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ set_default: true }),
      });

      toast.success("Brand voice saved! 🎉");
      router.push("/app");
      router.refresh();
    } catch {
      toast.error("Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      {step === "method" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">How would you like to set up your brand voice?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMethod(m.id); setStep("details"); }}
                className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 text-left hover:border-gray-400 hover:bg-gray-50 transition-all"
              >
                <span className="text-2xl">{m.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{m.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "details" && (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Give this profile a name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "My Etsy Shop" or "Freelance Brand"'
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your business name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="How should we address your business?"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          {method === "url" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourbusiness.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          )}

          {method === "quiz" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pick 2-4 words that describe your brand:</label>
                <div className="flex flex-wrap gap-2">
                  {KEYWORDS.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => toggleKeyword(kw)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedKeywords.includes(kw)
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Formality</label>
                <select
                  value={formality}
                  onChange={(e) => setFormality(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                  <option value="casual">Casual & Approachable</option>
                  <option value="professional">Professional & Polished</option>
                  <option value="luxury">Premium & Luxurious</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emoji usage in replies</label>
                <select
                  value={emojiStyle}
                  onChange={(e) => setEmojiStyle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                  <option value="never">No emojis</option>
                  <option value="occasional">Occasional emojis</option>
                  <option value="frequent">I love emojis!</option>
                </select>
              </div>
            </>
          )}

          {method === "manual" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Describe your brand voice</label>
              <textarea
                value={manualVoice}
                onChange={(e) => setManualVoice(e.target.value)}
                placeholder="Example: We're a warm, family-owned bakery. Our tone is friendly and personal. We use emojis occasionally and always address customers by name."
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
              />
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!businessName}
            className="mt-2 px-6 py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {method === "template" ? "Use this template" : "Generate brand voice"}
          </button>
        </div>
      )}

      {step === "generating" && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
          <p className="text-sm text-gray-500">
            {method === "url" ? "Analyzing your website..." : "Crafting your brand voice..."}
          </p>
        </div>
      )}

      {step === "review" && (
        <div className="flex flex-col gap-5">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Your brand voice</p>
            <p className="text-sm text-gray-800 leading-relaxed">{generatedDna}</p>
            {signOff && (
              <p className="text-xs text-gray-400 mt-2">Sign-off: {signOff}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom sign-off (optional)</label>
            <input
              type="text"
              value={signOff}
              onChange={(e) => setSignOff(e.target.value)}
              placeholder="- Sarah from Handmade with Heart"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("details")}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save & use this voice"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
