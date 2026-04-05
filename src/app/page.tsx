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
  },
  {
    title: "Tone control",
    desc: "Choose empathetic, firm, apologetic, or professional. The AI matches your style.",
  },
  {
    title: "Built for small business",
    desc: "Works for Etsy shops, Shopify stores, freelancers, restaurants, and SaaS products.",
  },
  {
    title: "One-click copy",
    desc: "Click Copy on the reply you want. Paste it directly into your email or message.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    desc: "Perfect for getting started",
    limit: "10 replies / month",
    cta: "Get started free",
    href: "/sign-up",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$9/mo",
    desc: "For growing businesses",
    limit: "100 replies / month",
    cta: "Coming soon",
    href: "#",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$19/mo",
    desc: "For high-volume sellers",
    limit: "Unlimited replies",
    cta: "Coming soon",
    href: "#",
    highlight: false,
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center text-center px-4 py-24 bg-white">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
          Powered by AI
        </span>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight max-w-2xl">
          Stop dreading customer complaints.
        </h1>
        <p className="mt-5 text-lg text-gray-500 max-w-xl">
          Paste any angry message. Get 3 professional, ready-to-send replies in
          seconds. No prompt engineering. No thinking. Just copy and send.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/sign-up"
            className="px-6 py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Try it free — no card needed
          </Link>
          <Link
            href="/app"
            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            See it in action
          </Link>
        </div>
      </section>

      {/* Demo */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            See what it generates
          </h2>
          {DEMO_EXAMPLES.map((ex, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Customer complaint
                </p>
                <p className="text-gray-600 text-sm italic">&ldquo;{ex.complaint}&rdquo;</p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  ReplyAI — {ex.tone} tone
                </p>
                <p className="text-gray-800 text-sm leading-relaxed">{ex.reply}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Everything you need, nothing you don&apos;t
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
            Simple pricing
          </h2>
          <p className="text-center text-gray-500 text-sm mb-12">
            Start free. Upgrade when you need more.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 flex flex-col gap-4 border ${
                  plan.highlight
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-900 border-gray-100"
                }`}
              >
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${plan.highlight ? "text-gray-400" : "text-gray-400"}`}>
                    {plan.name}
                  </p>
                  <p className={`text-3xl font-bold ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                    {plan.price}
                  </p>
                  <p className={`text-sm mt-1 ${plan.highlight ? "text-gray-400" : "text-gray-500"}`}>
                    {plan.desc}
                  </p>
                </div>
                <p className={`text-sm font-medium ${plan.highlight ? "text-gray-200" : "text-gray-700"}`}>
                  {plan.limit}
                </p>
                <Link
                  href={plan.href}
                  className={`mt-auto text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-white text-black hover:bg-gray-100"
                      : plan.cta === "Coming soon"
                      ? "border border-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-black text-white hover:bg-gray-800"
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
      <section className="bg-black px-4 py-24 text-center">
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
      <footer className="bg-black border-t border-white/10 px-4 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} ReplyAI. Built for small business owners who just want to reply and move on.
      </footer>
    </div>
  );
}
