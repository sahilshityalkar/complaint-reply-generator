# ReplyAI — Complete Project Master Plan
> Paste this into Cursor. This is your single source of truth.
> Every decision, every todo, every file, every reason. Nothing missing.

---

## What You're Building

A micro-SaaS web app where users paste a customer complaint and get 3
professional, ready-to-send replies in under 5 seconds. Powered by Claude AI.

**Core value:** Small business owners (Etsy sellers, freelancers, Shopify stores)
freeze when they get a rude customer message. This tool removes that anxiety
instantly. No prompt engineering. No thinking. Paste → click → copy → done.

---

## Tech Stack — Every Choice With a Reason

### Framework: Next.js 14 (App Router)
**Why:** One codebase handles your frontend, backend API routes, and server
components. No need for a separate Express server. Deploy to Vercel in one click.
The App Router lets you protect pages server-side without extra middleware.

### Styling: Tailwind CSS
**Why:** You write styles inline in JSX. No CSS files to manage, no naming
classes, no context switching. Faster to build, easier to maintain solo.

### Auth: Clerk
**Why over NextAuth or custom auth:** Clerk gives you a full auth system
(email + Google login, session management, webhooks) in under 30 minutes.
It handles password resets, email verification, user management dashboard —
all the boring stuff you don't want to build. Free up to 10,000 monthly active
users. When a user signs up, Clerk fires a webhook so you can create their
record in your database automatically.

### Database: Supabase (PostgreSQL)
**Why Supabase over MongoDB:**

MongoDB is a document database — great when your data has no fixed shape
(like a CMS or logging system). Your data has a very clear, fixed shape:
users have a plan, a usage count, and a reset date. That's relational data.
PostgreSQL handles it better with:
- Foreign keys (enforce that every usage row links to a real user)
- Row Level Security (users can only see their own data — built into Supabase)
- Transactions (when Stripe pays you, update plan + reset usage in one atomic operation)
- Free tier that includes Auth, Storage, and a real Postgres database

MongoDB would work, but you'd lose type safety, RLS, and the Supabase dashboard
which shows you your users, queries, and data in a clean UI for free.

**Why Supabase over plain Postgres:** Supabase wraps Postgres with a REST API,
a dashboard, Row Level Security, real-time subscriptions, and a generous free
tier. You don't need to manage a database server.

### Payments: Deferred to Phase 7 (Post-Launch)
**Why deferred:** Stripe requires business registration + KYC (GST/PAN) for
Indian accounts which adds friction before the product is validated. The goal
is to ship a working product first, then add monetization.

**Options being evaluated for India:**
- **Razorpay** — Indian-first, easier KYC, supports UPI/cards/netbanking (most likely choice)
- **Lemon Squeezy** — Merchant of record, handles GST automatically, no Indian entity needed
- **Paddle** — Similar to Lemon Squeezy, good for SaaS

**Decision point:** After first 20–30 real users give feedback, pick one and implement.
Stripe is still an option if you register a business entity.

### AI: Groq API (llama-3.3-70b-versatile)
**Why Groq for now:** Groq has a generous free tier — perfect for development
and testing without any upfront cost. Groq's LPU hardware makes inference
extremely fast (often <1s). Uses `groq-sdk` which is OpenAI-compatible, so
migrating to another provider later is trivial. Model choice:
- `llama-3.3-70b-versatile` — most capable, best reply quality (default)
- `llama-3.1-8b-instant` — faster fallback if rate limits hit

**When to switch:** Once you have paying users, evaluate Anthropic Claude or
OpenAI GPT-4o for reply quality. The swap is a 5-line code change.

### Hosting: Vercel
**Why:** One-click deploy from GitHub. Free hobby tier. Automatic HTTPS.
Preview deployments for every pull request. Zero DevOps.

### Email: Resend
**Why:** Transactional email (welcome email, upgrade confirmation, usage alerts)
with a clean API and a generous free tier (3,000 emails/month). Works
perfectly with Next.js API routes.

### Analytics: Plausible (or Vercel Analytics)
**Why:** Simple, privacy-friendly, GDPR compliant. Shows you signups,
page views, and traffic sources. No cookie banners needed.

---

## Database Structure (Supabase / PostgreSQL)

### Table 1: `users`
Synced from Clerk via webhook when someone signs up.

```sql
create table users (
  id          text primary key,        -- Clerk user ID (e.g. user_2abc...)
  email       text not null unique,
  created_at  timestamptz default now(),
  plan        text default 'free'      -- 'free' | 'starter' | 'pro'
    check (plan in ('free', 'starter', 'pro')),
  stripe_customer_id   text unique,    -- Set when they first go to checkout
  stripe_subscription_id text unique   -- Set when subscription is active
);
```

**Why this structure:** Plan lives on the user row so you can check it in one
query. Stripe IDs are stored here so webhooks can find the right user fast.

---

### Table 2: `usage`
Tracks how many replies each user has generated this month.

```sql
create table usage (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null references users(id) on delete cascade,
  month        text not null,          -- Format: '2026-04' (year-month)
  reply_count  integer default 0,
  unique(user_id, month)               -- One row per user per month
);
```

**Why this structure:** One row per user per month. When April ends and May
starts, a new row is created automatically. You never need to "reset" anything —
just query for the current month's row. The unique constraint prevents duplicate
rows even if two requests hit at the same time.

---

### Table 3: `reply_history`
(Phase 2 feature — build this in week 5+, not at launch)

```sql
create table reply_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null references users(id) on delete cascade,
  created_at   timestamptz default now(),
  complaint    text not null,
  tone         text not null,
  business_type text not null,
  replies      jsonb not null           -- Array of {label, tone, text}
);

create index on reply_history(user_id, created_at desc);
```

**Why jsonb for replies:** The 3 replies are always read together, never
individually queried. Storing them as one JSON blob is simpler and faster
than a separate `replies` table with foreign keys.

---

### Row Level Security (RLS) Policies
Enable this in Supabase so users can never read each other's data.

```sql
-- Enable RLS on all tables
alter table users enable row level security;
alter table usage enable row level security;
alter table reply_history enable row level security;

-- Users can only read/update their own row
create policy "users_own_data" on users
  for all using (id = auth.uid()::text);

-- Usage is only visible to the owner
create policy "usage_own_data" on usage
  for all using (user_id = auth.uid()::text);

-- Reply history is only visible to the owner
create policy "history_own_data" on reply_history
  for all using (user_id = auth.uid()::text);
```

---

### Usage Limits Per Plan

| Plan    | Monthly Limit | Price  |
|---------|--------------|--------|
| free    | 10 replies   | $0     |
| starter | 100 replies  | $9/mo  |
| pro     | unlimited    | $19/mo |

---

## Complete File Structure

```
replyai/
├── app/
│   ├── layout.tsx                  # Root layout, fonts, metadata
│   ├── globals.css                 # Tailwind + CSS variables
│   ├── page.tsx                    # Landing page (homepage)
│   │
│   ├── app/
│   │   └── page.tsx                # Main tool page (protected)
│   │
│   ├── pricing/
│   │   └── page.tsx                # Pricing page
│   │
│   ├── dashboard/
│   │   └── page.tsx                # User dashboard (history, usage)
│   │
│   └── api/
│       ├── generate/
│       │   └── route.ts            # POST: call Claude, check limits, save usage
│       └── webhooks/
│           └── clerk/
│               └── route.ts        # POST: create user in DB on signup
│   # stripe webhook + create-checkout → added in Phase 7 when payments are implemented
│
├── components/
│   ├── Navbar.tsx                  # Top nav with login/logout
│   ├── Footer.tsx                  # Simple footer
│   ├── ReplyGenerator.tsx          # Main tool UI (textarea, buttons, results)
│   ├── ReplyCard.tsx               # Individual reply card with copy button
│   ├── UsageBadge.tsx              # Shows "7/10 replies used this month"
│   ├── UpgradeModal.tsx            # Shown when free limit is hit
│   └── PricingCard.tsx             # Plan card component
│
├── lib/
│   ├── supabase.ts                 # Supabase client (server-side)
│   ├── supabase-browser.ts         # Supabase client (client-side, if needed)
│   ├── groq.ts                     # Groq client
│   # stripe.ts → added in Phase 7 when payments are implemented
│   ├── usage.ts                    # Helper: getUsage(), incrementUsage(), checkLimit()
│   └── plans.ts                    # Plan limits config (free=10, starter=100, pro=∞)
│
├── middleware.ts                   # Clerk auth middleware — protects /app, /dashboard
├── .env.local                      # Your secrets (never commit this)
├── .env.local.example              # Template for env vars (commit this)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Environment Variables

Create a `.env.local` file in your project root. Copy from `.env.local.example`.

```bash
# Groq — https://console.groq.com → API Keys
GROQ_API_KEY=gsk_...

# Clerk — https://dashboard.clerk.com → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...         # From Clerk → Webhooks

# Supabase — https://supabase.com → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # Only used server-side (webhooks)

# Payments — DEFERRED to Phase 7. Leave these empty until then.
# Will add Razorpay or Lemon Squeezy keys here after product validation.
# PAYMENT_KEY=...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** Never push `.env.local` to GitHub. Add it to `.gitignore` immediately.

---

## API Routes — What Each One Does

### POST `/api/generate`
The most important route. Called when user clicks "Generate replies."

Logic:
1. Get the current user from Clerk session
2. Fetch their plan from Supabase `users` table
3. Fetch their usage from `usage` table for current month
4. If usage >= plan limit → return 403 with `{ error: 'limit_reached' }`
5. Call Claude API with the complaint + tone + business type
6. Parse the JSON response from Claude
7. Increment `usage.reply_count` by 1 in Supabase
8. Return the 3 replies to the frontend

```typescript
// Pseudocode — you'll flesh this out in Cursor
export async function POST(req: Request) {
  const { userId } = auth()                    // Clerk
  if (!userId) return 401

  const { complaint, tone, bizType } = await req.json()

  const user = await getUser(userId)           // from Supabase
  const usage = await getUsage(userId)         // current month
  const limit = PLAN_LIMITS[user.plan]         // from lib/plans.ts

  if (limit !== -1 && usage.reply_count >= limit) {
    return Response.json({ error: 'limit_reached' }, { status: 403 })
  }

  const replies = await callClaude(complaint, tone, bizType)
  await incrementUsage(userId)

  return Response.json({ replies })
}
```

---

### POST `/api/webhooks/clerk`
Triggered by Clerk when a user signs up.

Logic:
1. Verify the webhook signature (using `svix` library)
2. If event type is `user.created` → insert row into `users` table
3. If event type is `user.deleted` → delete from `users` table (cascades to usage)

---

### POST `/api/webhooks/stripe`
Triggered by Stripe when payment succeeds or subscription changes.

Logic:
1. Verify webhook signature with `stripe.webhooks.constructEvent()`
2. Handle these events:
   - `checkout.session.completed` → update user's `stripe_customer_id` + `stripe_subscription_id`, set plan to 'starter' or 'pro'
   - `customer.subscription.updated` → update plan if they switch tiers
   - `customer.subscription.deleted` → downgrade plan back to 'free'
   - `invoice.payment_failed` → optional: send email warning

---

### POST `/api/create-checkout`
Called when user clicks "Upgrade" or "Get Starter."

Logic:
1. Get user from Clerk session
2. Create a Stripe Checkout session with the correct price ID
3. Pass `client_reference_id: userId` so the webhook knows which user paid
4. Return the checkout URL
5. Frontend redirects user to `session.url`

---

## Complete Todo List — Start to End

Work through this in order. Do not skip ahead. Each step depends on the previous.

### Phase 0 — Project Setup (Day 1, ~2 hours)

- [ ] Create new Next.js 14 app: `npx create-next-app@latest replyai --typescript --tailwind --app`
- [ ] Delete the default boilerplate in `app/page.tsx` and `app/globals.css`
- [ ] Install dependencies:
  ```bash
  npm install groq-sdk @clerk/nextjs @supabase/supabase-js svix resend react-hot-toast clsx
  ```
- [ ] Create `.gitignore` — add `.env.local` to it
- [ ] Create `.env.local` file with all the variable names (values empty for now)
- [ ] Push to a new GitHub repo: `git init && git add . && git commit -m "init"`
- [ ] Connect GitHub repo to Vercel — deploy immediately (it will be blank, that's fine)
- [ ] Verify Vercel deployment works at your-app.vercel.app

---

### Phase 1 — Core AI Tool (Days 2–4, ~1 day)

- [ ] Create `lib/groq.ts` — export the Groq client
- [ ] Create `app/api/generate/route.ts` — hardcode the logic without auth for now (just get it working)
- [ ] Create `components/ReplyGenerator.tsx` — the textarea, tone buttons, generate button, results
- [ ] Create `components/ReplyCard.tsx` — individual reply with copy button
- [ ] Create `app/app/page.tsx` — the main tool page, render `<ReplyGenerator />`
- [ ] Test end to end: type a complaint, click generate, see 3 replies appear
- [ ] Add error handling: what if Claude is down? What if input is empty?
- [ ] Add loading state: spinner on button while generating
- [ ] Make it mobile responsive (check on your phone)

**Checkpoint:** You should be able to generate replies with no auth, no limits. Core product works.

---

### Phase 2 — Database Setup (Day 4–5, ~half day)

- [ ] Create a Supabase project at supabase.com
- [ ] Copy your Supabase URL and keys into `.env.local`
- [ ] Open Supabase SQL Editor and run the table creation SQL from the Database Structure section above
- [ ] Enable Row Level Security on all 3 tables
- [ ] Add the RLS policies from the Database Structure section above
- [ ] Create `lib/supabase.ts` — server-side Supabase client using `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Create `lib/usage.ts` with functions:
  - `getUser(userId)` — fetch user row
  - `createUser(userId, email)` — insert user row
  - `getUsage(userId)` — fetch current month's usage row
  - `incrementUsage(userId)` — increment reply_count by 1
  - `checkLimit(userId)` — returns true if user is under their limit
- [ ] Create `lib/plans.ts` — export `PLAN_LIMITS = { free: 10, starter: 100, pro: -1 }`

---

### Phase 3 — Auth with Clerk (Days 5–7, ~1 day)

- [ ] Create a Clerk app at clerk.com
- [ ] Enable Email + Google as sign-in methods in Clerk dashboard
- [ ] Copy Clerk keys into `.env.local`
- [ ] Wrap the root layout with `<ClerkProvider>` in `app/layout.tsx`
- [ ] Create `middleware.ts` — protect `/app` and `/dashboard` routes
  ```typescript
  import { authMiddleware } from '@clerk/nextjs'
  export default authMiddleware({ publicRoutes: ['/', '/pricing'] })
  export const config = { matcher: ['/((?!.*\\..*|_next).*)', '/'] }
  ```
- [ ] Add Sign In / Sign Up buttons to `components/Navbar.tsx` using Clerk's `<SignInButton>` and `<UserButton>`
- [ ] Test: visiting `/app` without login should redirect to sign-in
- [ ] Set up Clerk webhook:
  - In Clerk dashboard → Webhooks → Add endpoint
  - URL: `https://your-app.vercel.app/api/webhooks/clerk`
  - Events: `user.created`, `user.deleted`
  - Copy the signing secret into `.env.local` as `CLERK_WEBHOOK_SECRET`
- [ ] Create `app/api/webhooks/clerk/route.ts`:
  - Use `svix` to verify the webhook signature
  - On `user.created` → call `createUser(userId, email)` in Supabase
  - On `user.deleted` → delete user from Supabase
- [ ] Test webhook: sign up a test account → verify a row appears in Supabase `users` table
- [ ] Update `/api/generate/route.ts` to:
  - Get `userId` from Clerk `auth()`
  - Return 401 if not logged in
  - Check usage limit before calling Claude
  - Increment usage after successful generation
- [ ] Add `<UsageBadge />` component to the tool page showing "7 / 10 replies used"

**Checkpoint:** Sign up works. Usage is tracked. Limit blocks generation.

---

### Phase 4 — Payments (DEFERRED — implement after real users)

> **Skip this for now.** Build the product, get real users, collect feedback.
> Come back here once people are actually using it and asking how to pay.

**Decision checklist before implementing payments:**
- [ ] Have at least 20–30 real users actively using the tool
- [ ] Received feedback that people would pay for more replies
- [ ] Decided on payment provider (Razorpay vs Lemon Squeezy — see Tech Stack section)

**When ready, the payment flow will:**
1. `<UpgradeModal />` appears when free user hits 10-reply limit
2. User clicks upgrade → redirected to payment provider checkout
3. Webhook fires on successful payment → update `users.plan` in Supabase
4. User gets bumped to Starter (100 replies) or Pro (unlimited)

**Placeholder in the UI:** For now, the `<UpgradeModal />` can show a
"Coming soon — join the waitlist" form (collect emails with Resend).

**Checkpoint (when you do implement):** Full payment flow works. Plan upgrades instantly.

---

### Phase 5 — Landing Page (Days 10–12, ~1 day)

- [ ] Create `app/page.tsx` — the homepage
- [ ] Sections to build (in order):
  - Hero: headline, subheading, "Try it free" CTA button
  - Demo: show 2 complaint/reply examples (hardcoded, no API call)
  - Features: 4 feature cards (3 replies, tone control, business types, copy)
  - Pricing: embed the same plan cards from /pricing
  - CTA: bottom section with "Start for free" button
- [ ] Create `components/Navbar.tsx`:
  - Logo/name on left
  - "Pricing" link in middle
  - Sign In / Sign Up buttons on right (Clerk components)
  - When logged in: show the tool link + `<UserButton />`
- [ ] Create `components/Footer.tsx`:
  - Links: Privacy Policy, Terms of Service, Contact
  - Copyright line
- [ ] Make every section mobile responsive
- [ ] Add SEO metadata in `app/layout.tsx` (title, description, og:image)

---

### Phase 6 — Polish + Pre-launch (Days 12–14, ~2 days)

- [ ] Set up Resend for transactional email:
  - Create account at resend.com
  - Add API key to `.env.local`
  - Create `lib/resend.ts`
  - Send welcome email when new user signs up (trigger from Clerk webhook handler)
  - Send "you've hit your limit" email when free user reaches 10 replies
- [ ] Add toast notifications (use `react-hot-toast`):
  - "Reply copied!" when user copies a reply
  - "Generating..." loading state
  - "Something went wrong" on error
- [ ] Error states to handle:
  - Complaint too short (under 20 characters)
  - Claude API rate limit
  - Supabase connection error
  - Stripe checkout failure
- [ ] Add `/dashboard` page:
  - Show current plan + usage for this month
  - Link to manage subscription (Stripe Customer Portal)
  - Show last 5 replies (if you build reply history)
- [ ] Create Stripe Customer Portal link:
  - `stripe.billingPortal.sessions.create({ customer: user.stripe_customer_id })`
  - User can cancel, upgrade, or update payment method themselves
- [ ] Privacy Policy page (`app/privacy/page.tsx`) — use a generator like iubenda.com
- [ ] Terms of Service page (`app/terms/page.tsx`) — use a generator
- [ ] Test the full flow as a new user from scratch:
  - Land on homepage → click try free → use 10 replies → see upgrade modal → pay → get unlimited → copy a reply
- [ ] Test on mobile (iPhone and Android if possible)
- [ ] Test in Chrome, Firefox, Safari

---

### Phase 7 — Launch (Day 14–16)

- [ ] Buy your domain (namecheap.com or porkbun.com — ~$10/year)
- [ ] Connect domain to Vercel:
  - Vercel Dashboard → Project → Settings → Domains → Add domain
  - Follow the DNS instructions
- [ ] Add production environment variables to Vercel:
  - Vercel Dashboard → Project → Settings → Environment Variables
  - Add all the same vars from `.env.local` with production values
  - Use production Stripe keys (not test keys)
- [ ] Update all webhook URLs in Clerk and Stripe dashboards to your production domain
- [ ] Set `NEXT_PUBLIC_APP_URL` to your production domain
- [ ] Deploy production build: `git push` → Vercel auto-deploys
- [ ] Smoke test production: sign up, generate replies, upgrade, cancel
- [ ] Set up Plausible (plausible.io) or Vercel Analytics for visitor tracking
- [ ] Write and schedule launch posts:
  - Product Hunt (submit at midnight PST on a Tuesday)
  - Indie Hackers (write a "I built this in 2 weeks" story)
  - Reddit r/SaaS, r/etsy, r/freelance
  - Twitter/X with a screen recording
- [ ] Tell 10 people you know — friends, family, ex-colleagues. Ask for honest feedback.

---

### Phase 8 — Post-Launch Iteration (Weeks 3–4)

- [ ] Read every sign-up email notification. Reach out to first 20 users personally.
- [ ] Add reply history feature:
  - Create `reply_history` table in Supabase (SQL above)
  - Save every generation to this table (after successful Claude response)
  - Show last 20 replies in `/dashboard`
- [ ] Add custom tone presets (Pro feature):
  - Let users save a "default tone instruction" that gets appended to every prompt
  - Store in Supabase `users` table as a `custom_tone_instruction text` column
- [ ] Set up email drip with Resend:
  - Day 1 after signup: welcome email with tips
  - Day 5: "you have X free replies left this month" nudge
  - Day 7: "upgrade and never worry about replies again"
- [ ] A/B test your headline on the homepage using Vercel Edge Config or a simple cookie

---

## Prompt Engineering — The Claude Prompt

This is the exact system prompt structure for your `/api/generate` route.
The quality of this prompt determines the quality of your product.

```typescript
// lib/groq.ts
import Groq from 'groq-sdk'
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
export const MODEL = 'llama-3.3-70b-versatile'  // swap to 'llama-3.1-8b-instant' for speed

// In your /api/generate route:
const completion = await groq.chat.completions.create({
  model: MODEL,
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.7,
})
const raw = completion.choices[0].message.content
const { replies } = JSON.parse(raw)
```

```typescript
const prompt = `You are a professional customer service expert helping a ${bizType} owner 
respond to a difficult customer complaint with empathy and professionalism.

The customer wrote:
"""
${complaint}
"""

Generate exactly 3 different professional reply variations. The user's preferred 
primary tone is: ${tone}.

Return ONLY valid JSON in this exact format, no extra text, no markdown:
{
  "replies": [
    {
      "label": "Empathetic & Understanding",
      "tone": "empathetic",
      "text": "..."
    },
    {
      "label": "Firm & Solution-Focused", 
      "tone": "firm",
      "text": "..."
    },
    {
      "label": "Apologetic & Generous",
      "tone": "apologetic", 
      "text": "..."
    }
  ]
}

Rules for every reply:
- 3 to 5 sentences maximum
- Professional but human — not robotic
- Address the specific issue mentioned (do not give generic replies)
- Do not include placeholder text like [Your Name] or [Order Number]
- The first reply must match the requested tone (${tone}) most closely
- Each reply should be meaningfully different from the others
- For ${bizType}: use industry-appropriate language and empathy`
```

---

## Common Mistakes to Avoid

1. **Building reply history before auth works.** Do auth first. Features second.
2. **Testing Stripe with real money.** Always use test mode and test cards until you're 100% sure the flow works.
3. **Forgetting to verify webhook signatures.** Without verification, anyone can fake a Stripe payment. Always verify.
4. **Storing API keys in code.** Every secret goes in `.env.local`. Never in a component, never hardcoded.
5. **Skipping mobile testing.** Half your users will be on a phone. Test every page on mobile.
6. **Building the Chrome extension before the web app has paying users.** Validate the idea first. Extensions add complexity.
7. **Pushing `.env.local` to GitHub.** Add it to `.gitignore` on day one and never remove it.
8. **Waiting for perfection to launch.** Ship with the 6 Phase 1–5 features. That's a complete product. Everything else is iteration.

---

## Package Install Command (Run Once)

```bash
npx create-next-app@latest replyai --typescript --tailwind --app --src-dir=false --import-alias="@/*"

cd replyai

npm install \
  groq-sdk \
  @clerk/nextjs \
  @supabase/supabase-js \
  svix \
  resend \
  react-hot-toast \
  clsx

# stripe is NOT installed yet — deferred to Phase 7
```

---

## Quick Reference — Plan Limits in Code

```typescript
// lib/plans.ts
export const PLAN_LIMITS: Record<string, number> = {
  free:    10,
  starter: 100,
  pro:     -1,   // -1 means unlimited
}

export function isUnderLimit(plan: string, currentCount: number): boolean {
  const limit = PLAN_LIMITS[plan]
  if (limit === -1) return true          // Pro = always allowed
  return currentCount < limit
}
```

---

## Revenue Math — What You're Working Toward

| Milestone          | Users                        | MRR     | Timeline |
|--------------------|------------------------------|---------|----------|
| First revenue      | 1 paid user                  | $9      | Week 7   |
| Cover API costs    | 5 paid users                 | $45     | Week 8   |
| Side income        | 30 Starter + 10 Pro = 40 paid| $460    | Month 3  |
| Meaningful MRR     | 80 Starter + 30 Pro = 110 paid | $1,290 | Month 6 |

Claude API cost per 1,000 requests ≈ $1.50 (at ~500 tokens per request).
At 100 users × 30 requests/month = 3,000 requests = ~$4.50/month in API costs.
Your margins are extremely high.

---

## That's Everything

You have:
- The full product vision
- Every tech decision with a reason
- The complete database schema
- Every file you need to create
- A numbered todo list from first command to launch day
- The exact Claude prompt
- The API route logic
- The Stripe webhook flow
- Common mistakes to avoid
- Revenue projections

Open Cursor. Start with Phase 0. Check off each item as you go.
Do not move to the next phase until the current one is working end to end.

Good luck. Ship it.