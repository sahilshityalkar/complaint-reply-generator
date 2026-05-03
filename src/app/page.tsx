import Link from "next/link";

const DEMO_EXAMPLES = [
  {
    complaint:
      "I ordered 3 weeks ago and still haven't received my package. This is completely unacceptable and I want a refund immediately!",
    reply:
      "I completely understand your frustration, and I sincerely apologize for the delay. This is not the experience we want for our customers. I've looked into your order and I'm escalating this immediately — I'll have a resolution for you within 24 hours. Thank you for your patience and for giving us the chance to make this right.",
    tone: "Empathetic",
  },
  {
    complaint:
      "The product I received looks nothing like the photos. The quality is terrible and I feel completely misled. Never buying from you again.",
    reply:
      "I'm sorry the product didn't meet your expectations — that's genuinely disappointing to hear. You deserve exactly what was shown, and clearly we fell short here. I'd like to offer you a full refund or a replacement at no cost. Please reply with your preference and I'll process it today.",
    tone: "Apologetic",
  },
];

const FEATURES = [
  {
    title: "3 replies in seconds",
    desc: "Paste a complaint, click generate. Three ready-to-send replies appear in under 5 seconds.",
    icon: "⚡",
  },
  {
    title: "Multi-language support",
    desc: "Reply in Hinglish, Hindi, Tamil, Marathi, Bengali, or English. Auto-detects the customer's language.",
    icon: "🌐",
  },
  {
    title: "Tone control",
    desc: "Choose empathetic, firm, apologetic, or professional. The AI matches your style perfectly.",
    icon: "🎯",
  },
  {
    title: "Saved reply templates",
    desc: "Save your best replies and reuse them with one click. No need to regenerate common responses.",
    icon: "📋",
  },
  {
    title: "Built for small business",
    desc: "Works for Etsy shops, Shopify stores, freelancers, restaurants, and SaaS products.",
    icon: "🏪",
  },
  {
    title: "One-click send",
    desc: "Send replies directly via email or copy to clipboard. Your customer gets a response in seconds.",
    icon: "✉️",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    desc: "Perfect for getting started",
    limit: "10 replies / month",
    languages: "3 languages",
    cta: "Get started free",
    href: "/sign-up",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$9/mo",
    desc: "For growing businesses",
    limit: "100 replies / month",
    languages: "7+ languages",
    cta: "Coming soon",
    href: "#",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$19/mo",
    desc: "For high-volume sellers",
    limit: "Unlimited replies",
    languages: "7+ languages",
    cta: "Coming soon",
    href: "#",
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    quote: "As an Etsy seller, I get complaints in Hinglish all the time. ReplyAI automatically detects the language and replies in Hinglish — it sounds like me, not a robot.",
    name: "Priya M.",
    role: "Etsy Shop Owner, Mumbai",
  },
  {
    quote: "I used to spend 15 minutes crafting each response. Now I generate 3 replies and pick the best one in 5 seconds. The templates feature changed my workflow entirely.",
    name: "Rahul S.",
    role: "Shopify Store, Delhi",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center text-center px-4 py-24 bg-white dark:bg-gray-950">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
          Powered by AI
        </span>
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight max-w-2xl">
          Stop dreading customer complaints.
        </h1>
        <p className="mt-5 text-lg text-gray-500 dark:text-gray-400 max-w-xl">
          Paste any angry message. Get 3 professional, ready-to-send replies in
          seconds. No prompt engineering. No thinking. Just copy and send.
        </p>

        {/* Language badges */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <span className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
            🇮🇳 Hinglish
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
            हिन्दी
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
            English
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
            தமிழ்
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
            मराठी
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
            বাংলা
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
            + more
          </span>
        </div>

        <div className="mt-8 flex gap-3">
          <Link
            href="/sign-up"
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Try it free — no card needed
          </Link>
          <Link
            href="/app"
            className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            See it in action
          </Link>
        </div>
      </section>

      {/* Demo */}
      <section className="bg-gray-50 dark:bg-gray-900 px-4 py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            See what it generates
          </h2>
          {DEMO_EXAMPLES.map((ex, i) => (
            <div key={i} className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col gap-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                  Customer complaint
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm italic">&ldquo;{ex.complaint}&rdquo;</p>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                  ReplyAI — {ex.tone} tone
                </p>
                <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{ex.reply}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white dark:bg-gray-950 px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Loved by small business owners
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col gap-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 dark:bg-gray-900 px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Everything you need, nothing you don&apos;t
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
                <span className="text-xl mb-3 block">{f.icon}</span>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white dark:bg-gray-950 px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4">
            Simple pricing
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-12">
            Start free. Upgrade when you need more.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 flex flex-col gap-4 border ${
                  plan.highlight
                    ? "bg-black dark:bg-white text-white dark:text-black border-black"
                    : "bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-100 dark:border-gray-800"
                }`}
              >
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${plan.highlight ? "text-gray-400 dark:text-gray-500" : "text-gray-400 dark:text-gray-500"}`}>
                    {plan.name}
                  </p>
                  <p className={`text-3xl font-bold ${plan.highlight ? "text-white dark:text-black" : "text-gray-900 dark:text-white"}`}>
                    {plan.price}
                  </p>
                  <p className={`text-sm mt-1 ${plan.highlight ? "text-gray-400 dark:text-gray-600" : "text-gray-500 dark:text-gray-400"}`}>
                    {plan.desc}
                  </p>
                </div>
                <p className={`text-sm font-medium ${plan.highlight ? "text-gray-200 dark:text-gray-700" : "text-gray-700 dark:text-gray-300"}`}>
                  {plan.limit}
                </p>
                <p className={`text-xs ${plan.highlight ? "text-gray-400 dark:text-gray-600" : "text-gray-400 dark:text-gray-500"}`}>
                  {plan.languages}
                </p>
                <Link
                  href={plan.href}
                  className={`mt-auto text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-white dark:bg-black text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                      : plan.cta === "Coming soon"
                      ? "border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      : "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black dark:bg-gray-900 px-4 py-24 text-center border-t border-white/10">
        <h2 className="text-3xl font-bold text-white max-w-xl mx-auto leading-tight">
          Your next customer complaint is already written. Your reply shouldn&apos;t take 20 minutes.
        </h2>
        <p className="mt-4 text-gray-400 text-sm">
          Join for free. No credit card required.
        </p>
        <Link
          href="/sign-up"
          className="mt-8 inline-block px-8 py-3 bg-white text-black rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          Get started free
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-black dark:bg-gray-900 border-t border-white/10 px-4 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} ReplyAI. Built for small business owners who just want to reply and move on.
      </footer>
    </div>
  );
}
