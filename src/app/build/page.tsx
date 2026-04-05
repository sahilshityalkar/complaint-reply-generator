import Link from "next/link";

const STACK = [
  {
    name: "Next.js 15",
    category: "Framework",
    why: "One codebase for frontend, backend API routes, and server components. No separate Express server. The App Router handles auth-protected pages server-side.",
    color: "bg-black text-white",
  },
  {
    name: "Groq API",
    category: "AI",
    why: "Free tier for development + extremely fast inference via LPU hardware. Using llama-3.3-70b-versatile — best open model for nuanced, empathetic customer service writing.",
    color: "bg-orange-500 text-white",
  },
  {
    name: "Clerk",
    category: "Auth",
    why: "Full auth system (email + Google) in under 30 minutes. Handles sessions, webhooks, and user management. Free up to 10k MAU. Webhook fires on signup to sync users to our DB.",
    color: "bg-purple-600 text-white",
  },
  {
    name: "Supabase",
    category: "Database",
    why: "PostgreSQL with Row Level Security, a REST API, and a free tier. Relational data fits our schema perfectly — users have a plan, usage has a count. RLS ensures users never see each other's data.",
    color: "bg-green-600 text-white",
  },
  {
    name: "Tailwind CSS",
    category: "Styling",
    why: "Styles inline in JSX. No CSS files, no class naming, no context switching. Faster to build and easier to maintain solo.",
    color: "bg-cyan-500 text-white",
  },
  {
    name: "Vercel",
    category: "Hosting",
    why: "One-click deploy from GitHub. Auto-deploys on every push. Free hobby tier. Zero DevOps — no server to manage.",
    color: "bg-gray-900 text-white",
  },
];

const PHASES = [
  {
    phase: "Phase 0",
    title: "Project Setup",
    duration: "Day 1",
    steps: [
      "Scaffolded Next.js 15 with TypeScript + Tailwind using create-next-app",
      "Installed all dependencies: groq-sdk, @clerk/nextjs, @supabase/supabase-js, svix, react-hot-toast, clsx",
      "Set up .env.local with all API keys — never committed to git",
      "Connected GitHub repo to Vercel for automatic deployments",
    ],
    color: "border-gray-300",
  },
  {
    phase: "Phase 1",
    title: "Core AI Tool",
    duration: "Day 2",
    steps: [
      "Built lib/groq.ts — Groq client exporting llama-3.3-70b-versatile model",
      "Built POST /api/generate — calls Groq with structured prompt, returns 3 reply variations as JSON",
      "Built ReplyGenerator component — textarea, tone selector (4 options), business type selector (6 options)",
      "Built ReplyCard component — displays reply with one-click copy",
      "Verified end-to-end: paste complaint → generate → 3 replies appear",
    ],
    color: "border-orange-300",
  },
  {
    phase: "Phase 2",
    title: "Database + Usage Tracking",
    duration: "Day 3",
    steps: [
      "Created Supabase project, ran SQL to create users and usage tables",
      "Enabled Row Level Security on all tables so users never read each other's data",
      "Built lib/supabase.ts — server-side client with service role key (bypasses RLS for admin ops)",
      "Built lib/usage.ts — getUser, createUser, getUsage, incrementUsage, checkLimit helpers",
      "Built lib/plans.ts — plan limits config (free=10, starter=100, pro=-1 for unlimited)",
      "Created increment_usage PostgreSQL function for atomic, race-condition-safe counter",
      "Updated /api/generate to check plan limits before calling Groq, increment after success",
    ],
    color: "border-green-300",
  },
  {
    phase: "Phase 3",
    title: "Auth with Clerk",
    duration: "Day 4",
    steps: [
      "Wrapped root layout with ClerkProvider, configured sign-in/sign-up redirect URLs",
      "Built middleware.ts using clerkMiddleware() — protects /app and /dashboard routes",
      "Built split-screen sign-in/sign-up pages — black branding panel left, Clerk form right",
      "Built Navbar with Show when='signed-in'/'signed-out' — Sign in, Get started, Tool, Dashboard links",
      "Set up Clerk webhook endpoint — verifies svix signature, handles user.created/updated/deleted",
      "user.created → insert row in Supabase users table",
      "user.updated → sync email change to Supabase",
      "user.deleted → delete user row (cascades to usage and reply_history)",
    ],
    color: "border-purple-300",
  },
  {
    phase: "Phase 4",
    title: "Landing Page",
    duration: "Day 5",
    steps: [
      "Hero section — headline, subheading, two CTAs",
      "Demo section — 2 hardcoded complaint/reply examples showing the product",
      "Features section — 4 feature cards",
      "Pricing section — Free/Starter/Pro cards (paid plans show Coming soon)",
      "CTA section — black bottom banner with sign up button",
      "Footer with copyright",
    ],
    color: "border-blue-300",
  },
  {
    phase: "Phase 5",
    title: "Polish",
    duration: "Day 6",
    steps: [
      "Built UsageBadge component — shows X/10 replies used with progress bar, turns yellow at 70%, red at limit",
      "Built UpgradeModal — appears when free limit hit, shows plan options and waitlist CTA",
      "Added react-hot-toast notifications — Generating... → 3 replies ready! → Reply copied!",
      "Added character counter on textarea with live validation (needs 20+ chars)",
      "Built GET /api/usage endpoint — returns count, limit, plan for the badge",
    ],
    color: "border-yellow-300",
  },
  {
    phase: "Phase 6",
    title: "Reply History",
    duration: "Day 7",
    steps: [
      "Created reply_history table in Supabase with jsonb column for replies array",
      "Updated /api/generate to save every generation to reply_history (fire-and-forget, doesn't block response)",
      "Built /dashboard page — server component fetching usage + last 20 generations in parallel",
      "Dashboard shows usage stats with progress bar, full reply history with complaint preview, tone, business type, and all 3 replies",
    ],
    color: "border-red-300",
  },
];

const SCHEMA = [
  {
    table: "users",
    columns: [
      { name: "id", type: "text PK", note: "Clerk user ID" },
      { name: "email", type: "text", note: "unique" },
      { name: "plan", type: "text", note: "'free' | 'starter' | 'pro'" },
      { name: "created_at", type: "timestamptz", note: "default now()" },
      { name: "stripe_customer_id", type: "text", note: "null until payment" },
    ],
  },
  {
    table: "usage",
    columns: [
      { name: "id", type: "uuid PK", note: "auto generated" },
      { name: "user_id", type: "text FK", note: "→ users.id" },
      { name: "month", type: "text", note: "'2026-04' format" },
      { name: "reply_count", type: "integer", note: "default 0" },
    ],
  },
  {
    table: "reply_history",
    columns: [
      { name: "id", type: "uuid PK", note: "auto generated" },
      { name: "user_id", type: "text FK", note: "→ users.id" },
      { name: "complaint", type: "text", note: "original complaint" },
      { name: "tone", type: "text", note: "selected tone" },
      { name: "business_type", type: "text", note: "selected biz type" },
      { name: "replies", type: "jsonb", note: "array of 3 reply objects" },
      { name: "created_at", type: "timestamptz", note: "default now()" },
    ],
  },
];

const DECISIONS = [
  {
    decision: "Groq over OpenAI/Anthropic",
    reason: "Free tier removes all cost friction during development and testing. The llama-3.3-70b model produces reply quality comparable to GPT-4o for this specific use case. Swapping to another provider is a 5-line change.",
  },
  {
    decision: "Payments deferred",
    reason: "Stripe requires KYC/business registration for Indian accounts. Decision: ship the product first, validate with real users, then add Razorpay or Lemon Squeezy when people actually ask how to pay.",
  },
  {
    decision: "jsonb for replies column",
    reason: "The 3 replies are always read together, never individually queried. Storing them as one JSON blob is simpler and faster than a separate replies table with foreign keys.",
  },
  {
    decision: "increment_usage as a Postgres function",
    reason: "If two requests hit simultaneously, both could read reply_count=5 and both write 6 instead of 7. The Postgres function uses INSERT ... ON CONFLICT DO UPDATE which is atomic and race-condition safe.",
  },
  {
    decision: "Service role key only server-side",
    reason: "The service role key bypasses RLS. It only lives in server-side API routes and webhooks — never in client components. Client uses the anon key which respects RLS policies.",
  },
  {
    decision: "Fire-and-forget for reply history",
    reason: "Saving to reply_history should not slow down the response. The user gets their replies immediately. If the DB insert fails, they still got their replies — history is a nice-to-have, not blocking.",
  },
];

export default function BuildPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-black text-white px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Engineering Case Study
          </p>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            How I built ReplyAI
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            A micro-SaaS that turns customer complaints into 3 professional replies in under 5 seconds.
            Built in 7 days using Next.js, Groq, Clerk, and Supabase.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {["Next.js 15", "TypeScript", "Groq AI", "Clerk Auth", "Supabase", "Vercel"].map((t) => (
              <span key={t} className="text-xs px-3 py-1.5 rounded-full border border-white/20 text-gray-300">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-8 flex gap-4">
            <Link
              href="/app"
              className="px-5 py-2.5 bg-white text-black rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              Try the app
            </Link>
            <a
              href="https://github.com/sahilshityalkar/complaint-reply-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 border border-white/20 text-white rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Architecture overview */}
      <section className="px-4 py-16 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-8">System Architecture</h2>
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 font-mono text-sm">
            <div className="flex flex-col gap-3 text-gray-700">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 bg-black text-white rounded-lg text-xs">Browser</span>
                <span className="text-gray-400">React UI — ReplyGenerator, UsageBadge, Dashboard</span>
              </div>
              <div className="pl-6 text-gray-400">↓ POST /api/generate  ↑ 3 replies JSON</div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs">Next.js API</span>
                <span className="text-gray-400">Server-side — auth check → limit check → Groq → save history</span>
              </div>
              <div className="pl-6 flex gap-8 text-gray-400">
                <span>↓ verify userId</span>
                <span>↓ check plan limit</span>
                <span>↓ call LLM</span>
                <span>↓ save to DB</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap gap-y-2">
                <span className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs">Clerk</span>
                <span className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs">Supabase</span>
                <span className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs">Groq</span>
                <span className="text-gray-400 text-xs">← 3 external services, all free tier</span>
              </div>
              <div className="pl-6 text-gray-400">↑ Clerk webhook on user.created → auto-insert to users table</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="px-4 py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-8">Tech Stack — Every Choice Explained</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STACK.map((s) => (
              <div key={s.name} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${s.color}`}>
                    {s.name}
                  </span>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">{s.category}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{s.why}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Build phases timeline */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-8">Build Timeline — Phase by Phase</h2>
          <div className="flex flex-col gap-6">
            {PHASES.map((p, i) => (
              <div key={i} className={`border-l-4 ${p.color} pl-6 flex flex-col gap-3`}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{p.phase}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{p.duration}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{p.title}</h3>
                <ul className="flex flex-col gap-1.5">
                  {p.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Database schema */}
      <section className="px-4 py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-8">Database Schema</h2>
          <div className="flex flex-col gap-4">
            {SCHEMA.map((table) => (
              <div key={table.table} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 bg-gray-900 flex items-center gap-2">
                  <span className="text-xs text-gray-400">table</span>
                  <span className="text-sm font-bold text-white font-mono">{table.table}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {table.columns.map((col) => (
                    <div key={col.name} className="px-5 py-3 flex items-center gap-4">
                      <span className="font-mono text-sm text-gray-900 w-40 flex-shrink-0">{col.name}</span>
                      <span className="font-mono text-xs text-blue-600 w-32 flex-shrink-0">{col.type}</span>
                      <span className="text-xs text-gray-400">{col.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key decisions */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-8">Key Engineering Decisions</h2>
          <div className="flex flex-col gap-4">
            {DECISIONS.map((d, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl border border-gray-100 p-5 flex flex-col gap-2">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {i + 1}. {d.decision}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{d.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API flow */}
      <section className="px-4 py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-8">Core API Flow — /api/generate</h2>
          <div className="bg-gray-900 rounded-2xl p-6 font-mono text-sm text-gray-300 flex flex-col gap-2 overflow-x-auto">
            <p><span className="text-purple-400">POST</span> <span className="text-white">/api/generate</span></p>
            <p className="text-gray-500 mt-2">// 1. Verify Clerk session</p>
            <p><span className="text-blue-400">const</span> {"{ userId }"} = <span className="text-yellow-400">await auth()</span></p>
            <p><span className="text-gray-500">if (!userId) return 401</span></p>
            <p className="text-gray-500 mt-2">// 2. Auto-create user if first time</p>
            <p><span className="text-blue-400">let</span> user = <span className="text-yellow-400">await getUser(userId)</span></p>
            <p><span className="text-gray-500">if (!user) await createUser(userId, email)</span></p>
            <p className="text-gray-500 mt-2">// 3. Check plan limit</p>
            <p><span className="text-blue-400">const</span> ok = <span className="text-yellow-400">await checkLimit(userId)</span></p>
            <p><span className="text-gray-500">if (!ok) return 403 limit_reached</span></p>
            <p className="text-gray-500 mt-2">// 4. Call Groq LLM</p>
            <p><span className="text-blue-400">const</span> replies = <span className="text-yellow-400">await groq.chat.completions.create(...)</span></p>
            <p className="text-gray-500 mt-2">// 5. Increment usage + save history</p>
            <p><span className="text-yellow-400">await incrementUsage(userId)</span></p>
            <p><span className="text-gray-500">supabase.from(&apos;reply_history&apos;).insert(...) // fire and forget</span></p>
            <p className="text-gray-500 mt-2">// 6. Return to client</p>
            <p><span className="text-green-400">return</span> {"{ replies }"}</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-black px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">See it live</h2>
        <p className="text-gray-400 text-sm mb-8">The full product is deployed and working.</p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/app"
            className="px-6 py-3 bg-white text-black rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Try ReplyAI
          </Link>
          <a
            href="https://github.com/sahilshityalkar/complaint-reply-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-white/20 text-white rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            GitHub repo
          </a>
        </div>
      </section>
    </div>
  );
}
