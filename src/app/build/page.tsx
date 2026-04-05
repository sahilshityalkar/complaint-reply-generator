import Link from "next/link";

const STACK = [
  {
    name: "Next.js 15",
    category: "Framework",
    icon: "N",
    iconBg: "bg-black",
    why: "Single codebase for frontend, backend API routes, and server components. App Router handles auth-protected pages server-side with zero extra middleware.",
  },
  {
    name: "Groq API",
    category: "AI / LLM",
    icon: "G",
    iconBg: "bg-orange-500",
    why: "Free tier + LPU hardware makes inference blazing fast. llama-3.3-70b-versatile produces reply quality on par with GPT-4o for empathetic writing tasks.",
  },
  {
    name: "Clerk",
    category: "Authentication",
    icon: "C",
    iconBg: "bg-violet-600",
    why: "Complete auth system with email + Google in under 30 minutes. Webhook fires on user.created to auto-sync users into our own database.",
  },
  {
    name: "Supabase",
    category: "Database",
    icon: "S",
    iconBg: "bg-emerald-600",
    why: "PostgreSQL with Row Level Security baked in. RLS policies ensure users never read each other's data — enforced at the database level, not application level.",
  },
  {
    name: "Tailwind CSS",
    category: "Styling",
    icon: "T",
    iconBg: "bg-cyan-500",
    why: "Utility-first CSS means zero context switching between files. Styles live where the markup lives. Consistent design tokens out of the box.",
  },
  {
    name: "Vercel",
    category: "Deployment",
    icon: "V",
    iconBg: "bg-zinc-800",
    why: "Push to main → auto-deploy. Preview URLs for every branch. Zero DevOps, zero server management. HTTPS and CDN included for free.",
  },
];

const PHASES = [
  {
    num: "00",
    title: "Project Scaffold",
    tag: "Infrastructure",
    tagColor: "bg-zinc-100 text-zinc-600",
    steps: [
      "Bootstrapped Next.js 15 with TypeScript, Tailwind, App Router via create-next-app",
      "Installed groq-sdk, @clerk/nextjs, @supabase/supabase-js, svix, react-hot-toast",
      "Configured .env.local with secrets — enforced in .gitignore before first commit",
      "Connected repo to Vercel — blank deploy live within minutes",
    ],
  },
  {
    num: "01",
    title: "Core AI Feature",
    tag: "Product",
    tagColor: "bg-orange-50 text-orange-600",
    steps: [
      "lib/groq.ts — initialises Groq client, exports model constant",
      "POST /api/generate — structured prompt engineering, returns 3 reply variants as typed JSON",
      "ReplyGenerator component — textarea, 4 tone options, 6 business types, loading states",
      "ReplyCard component — reply display with clipboard copy",
    ],
  },
  {
    num: "02",
    title: "Database & Usage Limits",
    tag: "Backend",
    tagColor: "bg-emerald-50 text-emerald-700",
    steps: [
      "Supabase project created, users and usage tables with foreign keys and RLS enabled",
      "increment_usage() Postgres function — atomic INSERT … ON CONFLICT to prevent race conditions",
      "lib/usage.ts — getUser, createUser, getUsage, incrementUsage, checkLimit helpers",
      "lib/plans.ts — free=10, starter=100, pro=−1 (unlimited) config",
      "/api/generate updated to gate on plan limit before calling LLM",
    ],
  },
  {
    num: "03",
    title: "Authentication",
    tag: "Auth",
    tagColor: "bg-violet-50 text-violet-700",
    steps: [
      "ClerkProvider in root layout, signInUrl and signUpUrl configured",
      "middleware.ts — clerkMiddleware() protecting /app and /dashboard routes",
      "Split-screen auth pages — brand panel left, embedded Clerk form right",
      "Navbar — Show when='signed-in'/'signed-out' for conditional UI",
      "Clerk webhook at /api/webhooks/clerk — svix signature verification, handles user.created / updated / deleted",
    ],
  },
  {
    num: "04",
    title: "Landing Page",
    tag: "Marketing",
    tagColor: "bg-blue-50 text-blue-700",
    steps: [
      "Hero — value proposition headline, two CTAs",
      "Demo section — 2 hardcoded complaint/reply pairs showing the product in action",
      "Features grid — 4 cards",
      "Pricing section — Free / Starter / Pro, paid tiers show Coming Soon",
      "Black CTA section + footer",
    ],
  },
  {
    num: "05",
    title: "UX Polish",
    tag: "Frontend",
    tagColor: "bg-yellow-50 text-yellow-700",
    steps: [
      "UsageBadge — live X/10 counter with progress bar, yellow at 70%, red at limit",
      "UpgradeModal — triggered on 403 limit_reached, shows plan comparison",
      "react-hot-toast — Generating… → 3 replies ready! → Reply copied! feedback loop",
      "GET /api/usage endpoint powering the badge",
      "Character counter with inline validation below textarea",
    ],
  },
  {
    num: "06",
    title: "Reply History",
    tag: "Feature",
    tagColor: "bg-rose-50 text-rose-700",
    steps: [
      "reply_history table — jsonb column for replies array (read together, never queried individually)",
      "/api/generate saves to reply_history after response — fire-and-forget, zero latency impact",
      "/dashboard — React Server Component, parallel data fetching for usage + last 20 generations",
      "History cards show complaint preview, tone, business type, and all 3 replies",
    ],
  },
];

const SCHEMA = [
  {
    table: "users",
    desc: "Synced from Clerk via webhook on signup",
    columns: [
      { name: "id", type: "text", constraint: "PRIMARY KEY", note: "Clerk user ID (user_xxx)" },
      { name: "email", type: "text", constraint: "UNIQUE NOT NULL", note: "" },
      { name: "plan", type: "text", constraint: "DEFAULT 'free'", note: "'free' | 'starter' | 'pro'" },
      { name: "created_at", type: "timestamptz", constraint: "DEFAULT now()", note: "" },
      { name: "stripe_customer_id", type: "text", constraint: "UNIQUE", note: "null until first payment" },
    ],
  },
  {
    table: "usage",
    desc: "One row per user per calendar month",
    columns: [
      { name: "id", type: "uuid", constraint: "PRIMARY KEY", note: "gen_random_uuid()" },
      { name: "user_id", type: "text", constraint: "REFERENCES users(id)", note: "ON DELETE CASCADE" },
      { name: "month", type: "text", constraint: "NOT NULL", note: "'2026-04' — no resets needed" },
      { name: "reply_count", type: "integer", constraint: "DEFAULT 0", note: "incremented atomically" },
    ],
  },
  {
    table: "reply_history",
    desc: "Full log of every generation",
    columns: [
      { name: "id", type: "uuid", constraint: "PRIMARY KEY", note: "gen_random_uuid()" },
      { name: "user_id", type: "text", constraint: "REFERENCES users(id)", note: "ON DELETE CASCADE" },
      { name: "complaint", type: "text", constraint: "NOT NULL", note: "" },
      { name: "tone", type: "text", constraint: "NOT NULL", note: "" },
      { name: "business_type", type: "text", constraint: "NOT NULL", note: "" },
      { name: "replies", type: "jsonb", constraint: "NOT NULL", note: "array of 3 reply objects" },
      { name: "created_at", type: "timestamptz", constraint: "DEFAULT now()", note: "indexed DESC" },
    ],
  },
];

const DECISIONS = [
  {
    num: "01",
    title: "Groq over OpenAI / Anthropic",
    tag: "Cost",
    body: "Free tier removes all friction during development. llama-3.3-70b-versatile produces empathetic writing on par with GPT-4o for this use case. Switching providers is a 5-line change.",
  },
  {
    num: "02",
    title: "Atomic Postgres function for usage increment",
    tag: "Concurrency",
    body: "Two simultaneous requests could both read count=5 and both write 6 instead of 7. INSERT … ON CONFLICT DO UPDATE inside a Postgres function is atomic — no application-level locks needed.",
  },
  {
    num: "03",
    title: "jsonb column for replies",
    tag: "Schema",
    body: "The 3 replies are always read together, never queried individually. One jsonb blob is simpler and faster than a joined replies table. No JOIN, no N+1 problem.",
  },
  {
    num: "04",
    title: "Service role key only on the server",
    tag: "Security",
    body: "The service role key bypasses Row Level Security. It lives exclusively in server-side API routes and webhook handlers — never in client components or the browser.",
  },
  {
    num: "05",
    title: "Fire-and-forget for reply history",
    tag: "Performance",
    body: "History is a nice-to-have. The user gets their 3 replies immediately. Saving to reply_history runs in the background — if the insert fails, the user experience is unaffected.",
  },
  {
    num: "06",
    title: "Payments deferred to post-launch",
    tag: "Strategy",
    body: "Stripe requires KYC for Indian accounts. Ship the product first, validate with real users, then integrate Razorpay or Lemon Squeezy once people ask how to pay.",
  },
];

const CODE_FLOW = [
  { comment: "1. Authenticate", code: "const { userId } = await auth()", highlight: false },
  { comment: "", code: "if (!userId) return 401", highlight: false },
  { comment: "2. Auto-provision user", code: "let user = await getUser(userId)", highlight: false },
  { comment: "", code: "if (!user) await createUser(userId, email)", highlight: false },
  { comment: "3. Enforce plan limit", code: "const allowed = await checkLimit(userId)", highlight: true },
  { comment: "", code: "if (!allowed) return 403 'limit_reached'", highlight: false },
  { comment: "4. Call LLM", code: "const { replies } = await groq.chat.completions.create(...)", highlight: false },
  { comment: "5. Track usage (atomic)", code: "await incrementUsage(userId)", highlight: true },
  { comment: "6. Persist history (non-blocking)", code: "supabase.from('reply_history').insert({...})", highlight: false },
  { comment: "7. Respond", code: "return NextResponse.json({ replies })", highlight: false },
];

export default function BuildPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#3b0764_0%,_transparent_60%)] opacity-40" />
        <div className="relative max-w-4xl mx-auto px-6 py-24">
          <div className="flex items-center gap-2 mb-6">
            <span className="h-px w-8 bg-zinc-600" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Engineering Case Study
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            How I built<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              ReplyAI
            </span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl leading-relaxed mb-10">
            A full-stack micro-SaaS that converts customer complaints into
            3 professional replies in under 5 seconds — with auth, usage tracking,
            plan limits, and reply history.
          </p>

          <div className="flex flex-wrap gap-2 mb-10">
            {["Next.js 15", "TypeScript", "Groq LLM", "Clerk", "Supabase", "Tailwind", "Vercel"].map((t) => (
              <span
                key={t}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-medium"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-lg text-sm font-semibold hover:bg-zinc-100 transition-colors"
            >
              Live demo →
            </Link>
            <a
              href="https://github.com/sahilshityalkar/complaint-reply-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              GitHub repo
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="border-b border-zinc-100 bg-zinc-50">
        <div className="max-w-4xl mx-auto px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: "Build time", value: "7 days" },
            { label: "External services", value: "3 free tiers" },
            { label: "API routes", value: "4 endpoints" },
            { label: "DB tables", value: "3 with RLS" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Architecture ── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <SectionLabel>Architecture</SectionLabel>
        <h2 className="text-2xl font-bold text-zinc-900 mt-2 mb-8">How the system fits together</h2>
        <div className="bg-zinc-950 rounded-2xl p-8 overflow-x-auto">
          <div className="font-mono text-sm min-w-[480px] flex flex-col gap-4">
            <Row>
              <Pill color="bg-blue-500">Browser</Pill>
              <span className="text-zinc-500 text-xs">React UI — ReplyGenerator · UsageBadge · Dashboard</span>
            </Row>
            <Arrow label="POST /api/generate" sub="{ complaint, tone, bizType }" />
            <Row>
              <Pill color="bg-zinc-700">Next.js API Route</Pill>
              <span className="text-zinc-500 text-xs">auth → limit check → LLM → increment → save history</span>
            </Row>
            <div className="flex gap-3 pl-4 flex-wrap">
              <ConnectorDown />
              <ConnectorDown />
              <ConnectorDown />
            </div>
            <div className="flex gap-3 flex-wrap">
              <Pill color="bg-violet-600">Clerk</Pill>
              <Pill color="bg-emerald-600">Supabase</Pill>
              <Pill color="bg-orange-500">Groq LLM</Pill>
              <span className="text-zinc-600 text-xs self-center">← all free tier</span>
            </div>
            <div className="text-zinc-600 text-xs pl-1 mt-1">
              ↑ Clerk fires webhook on user.created → auto-inserts row into Supabase users table
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── Tech stack ── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <SectionLabel>Stack</SectionLabel>
        <h2 className="text-2xl font-bold text-zinc-900 mt-2 mb-8">Every tool, every reason</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STACK.map((s) => (
            <div
              key={s.name}
              className="group rounded-xl border border-zinc-100 bg-white p-5 hover:border-zinc-200 hover:shadow-sm transition-all flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {s.icon}
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 text-sm">{s.name}</p>
                  <p className="text-xs text-zinc-400">{s.category}</p>
                </div>
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed">{s.why}</p>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── Build timeline ── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <SectionLabel>Build Log</SectionLabel>
        <h2 className="text-2xl font-bold text-zinc-900 mt-2 mb-12">Phase by phase</h2>
        <div className="relative flex flex-col gap-0">
          {/* vertical line */}
          <div className="absolute left-[39px] top-0 bottom-0 w-px bg-zinc-100" />
          {PHASES.map((p) => (
            <div key={p.num} className="relative flex gap-6 pb-10 last:pb-0">
              <div className="flex-shrink-0 w-20 flex flex-col items-center pt-1">
                <div className="w-8 h-8 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center z-10">
                  {p.num}
                </div>
              </div>
              <div className="flex-1 pt-0.5">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-zinc-900">{p.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.tagColor}`}>
                    {p.tag}
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {p.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-zinc-600">
                      <svg className="w-3.5 h-3.5 mt-0.5 text-zinc-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── Database schema ── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <SectionLabel>Data Model</SectionLabel>
        <h2 className="text-2xl font-bold text-zinc-900 mt-2 mb-8">PostgreSQL schema with RLS</h2>
        <div className="flex flex-col gap-4">
          {SCHEMA.map((table) => (
            <div key={table.table} className="rounded-xl border border-zinc-100 overflow-hidden">
              <div className="px-5 py-3 bg-zinc-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-mono text-sm font-bold text-white">{table.table}</span>
                </div>
                <span className="text-xs text-zinc-500">{table.desc}</span>
              </div>
              <div className="divide-y divide-zinc-50">
                {table.columns.map((col) => (
                  <div key={col.name} className="px-5 py-3 grid grid-cols-12 gap-2 items-center hover:bg-zinc-50 transition-colors">
                    <span className="col-span-3 font-mono text-sm font-medium text-zinc-900">{col.name}</span>
                    <span className="col-span-3 font-mono text-xs text-blue-600">{col.type}</span>
                    <span className="col-span-3 text-xs text-zinc-400">{col.constraint}</span>
                    <span className="col-span-3 text-xs text-zinc-400">{col.note}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── Engineering decisions ── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <SectionLabel>Decisions</SectionLabel>
        <h2 className="text-2xl font-bold text-zinc-900 mt-2 mb-8">Non-obvious engineering choices</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DECISIONS.map((d) => (
            <div key={d.num} className="rounded-xl border border-zinc-100 p-5 flex flex-col gap-3 hover:border-zinc-200 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-mono text-zinc-400">{d.num}</span>
                  <h3 className="font-semibold text-zinc-900 text-sm mt-0.5">{d.title}</h3>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-600 font-medium flex-shrink-0">
                  {d.tag}
                </span>
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── API flow ── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <SectionLabel>Core Logic</SectionLabel>
        <h2 className="text-2xl font-bold text-zinc-900 mt-2 mb-8">
          POST /api/generate — annotated flow
        </h2>
        <div className="bg-zinc-950 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="ml-3 text-xs text-zinc-500 font-mono">src/app/api/generate/route.ts</span>
          </div>
          <div className="p-6 font-mono text-sm flex flex-col gap-1.5 overflow-x-auto">
            {CODE_FLOW.map((line, i) => (
              <div key={i}>
                {line.comment && (
                  <p className="text-zinc-600 text-xs mb-0.5">// {line.comment}</p>
                )}
                <p className={`${line.highlight ? "text-emerald-400" : "text-zinc-300"}`}>
                  {line.code}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-zinc-950 px-6 py-20">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Want to see it running?</h2>
            <p className="text-zinc-400 text-sm mt-1">
              Fully deployed on Vercel. Sign up free, no card required.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link
              href="/app"
              className="px-5 py-2.5 bg-white text-black rounded-lg text-sm font-semibold hover:bg-zinc-100 transition-colors whitespace-nowrap"
            >
              Try ReplyAI →
            </Link>
            <a
              href="https://github.com/sahilshityalkar/complaint-reply-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}

// ── Small reusable layout helpers ──────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-px w-5 bg-zinc-300" />
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
        {children}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="max-w-4xl mx-auto px-6"><div className="h-px bg-zinc-100" /></div>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 flex-wrap">{children}</div>;
}

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`${color} text-white text-xs font-semibold px-3 py-1.5 rounded-lg`}>
      {children}
    </span>
  );
}

function Arrow({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="pl-4 flex flex-col gap-0.5">
      <span className="text-zinc-500 text-xs">↓ {label}</span>
      <span className="text-zinc-700 text-xs pl-3">{sub}</span>
    </div>
  );
}

function ConnectorDown() {
  return <span className="text-zinc-700 text-xs">↓</span>;
}
