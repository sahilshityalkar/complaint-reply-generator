# ReplyAI — V2 Full Product Plan
> Draft for review. Confirm features before adding to MASTER_PLAN.md.
> Everything here is proposed — nothing is built yet.

---

## What V1 Is (Current State)

- User pastes complaint → selects tone + business type → gets 3 replies
- Auth with Clerk (email + Google)
- Usage limits per plan (free=10, starter=100, pro=unlimited)
- Reply history saved to Supabase
- Dashboard showing usage + last 20 generations
- Deployed on Vercel

**The gap:** V1 is a tool. V2 is a product. The difference is personalization, workflow, and platform awareness.

---

## Proposed V2 Features

### Feature 1 — Sidebar Layout (like ChatGPT)

**The problem with V1:**
Everything is on one page. History is buried in /dashboard.
There's no sense of "your workspace."

**The V2 layout:**

```
┌─────────────────────────────────────────────────────────┐
│  NAVBAR (ReplyAI logo + user avatar)                    │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  SIDEBAR     │   MAIN AREA                              │
│  (240px)     │                                          │
│              │   [Reply Generator]                      │
│  + New reply │   or                                     │
│              │   [Selected history item]                │
│  — History — │                                          │
│  Today       │                                          │
│   · Reply 1  │                                          │
│   · Reply 2  │                                          │
│  Yesterday   │                                          │
│   · Reply 3  │                                          │
│              │                                          │
│  — Account — │                                          │
│  Plan badge  │                                          │
│  Usage bar   │                                          │
│  Settings    │                                          │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

**What the sidebar shows:**
- "New reply" button at top
- History grouped by Today / Yesterday / Last 7 days / Older
- Each item shows first 40 chars of the complaint as the title
- Click any item → loads that generation in the main area (read-only view)
- Bottom: plan badge + usage bar + settings link

**Why this matters:**
Users who generate 10+ replies/month have no way to find old replies quickly.
A sidebar makes the product feel like a workspace they come back to,
not a one-shot tool they forget about.

---

### Feature 2 — Output Platform Selector

**The problem:**
A reply for WhatsApp is different from a reply for email.
Right now the AI doesn't know where the reply will be sent.

**Proposed platforms:**

| Platform | Format difference |
|---|---|
| WhatsApp / DM | Short, no subject line, casual, can use emoji |
| Email | Subject line + formal body, longer, sign-off |
| Instagram DM | Very short, friendly, brand voice |
| Google Review | Public-facing, SEO-aware, professional |
| Etsy / Shopify message | Marketplace-specific tone, mention resolution |
| SMS | Under 160 chars, extremely brief |

**How it works:**
- Add a "Send via" selector above the Generate button (icons + labels)
- Selected platform gets injected into the Groq prompt:
  `"Format this as a WhatsApp message — short, no subject line, conversational"`
- For Email: AI also generates a subject line and returns it separately
- For Google Review: AI knows it's public-facing and adjusts accordingly

**DB change needed:**
Add `platform text` column to `reply_history` table.

---

### Feature 3 — Custom Categories & AI Prompt Builder

**The problem:**
"Etsy shop" and "Freelancer" are generic.
A wedding photographer has different language than a software freelancer.
A restaurant owner's complaints are different from a SaaS support team.

**What this feature does:**
Users can create their own business profile that gets injected into every prompt.

**Two parts:**

#### Part A — Custom Business Profile
User fills in once, saved to their account:
- Business name: "Sahil's Photography Studio"
- Business type: "Wedding & event photographer"
- Tone personality: "Warm, professional, always offer a solution"
- Common complaint types: "Late delivery of photos, editing style mismatch"

This profile gets appended to every Groq prompt automatically.
No more generic replies — every reply sounds like it came from their actual business.

#### Part B — Custom Tone Presets
User creates named tones beyond the 4 defaults:
- "My brand voice" — saved once, auto-selected
- "Corporate escalation" — formal, reference policy
- "Win them back" — generous, offer discount

AI helps build the preset:
User types: "I want to sound like I really care but also protect my business legally"
AI returns: a structured tone instruction they can save and reuse.

**DB changes needed:**
```sql
-- Add to users table:
ALTER TABLE users ADD COLUMN business_profile jsonb;

-- New table:
CREATE TABLE custom_tones (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  name text not null,
  instruction text not null,
  created_at timestamptz default now()
);
```

---

### Feature 4 — Reply Editor + Send Preview

**The problem:**
Right now users copy the reply and paste it somewhere else.
They can't edit it before copying.

**What this feature adds:**
- Inline editable text area that appears when you click a reply card
- "Copy edited version" button
- Platform-specific preview:
  - Email preview shows a mock email client (subject + body)
  - WhatsApp preview shows a message bubble
  - Google Review preview shows a review response card

This makes the product feel more complete and reduces the gap between
"AI generated" and "ready to send."

---

### Feature 5 — Team / Multi-seat (Pro+ tier)

**For later — but plan for it now in the DB design.**

Small businesses often have a VA or customer service person handling replies.
Pro+ plan allows multiple team members under one account.

**What's needed:**
- `teams` table (owner_id, name, plan)
- `team_members` table (team_id, user_id, role)
- Usage limits shared across the team
- One billing account, multiple users

**Don't build this yet.** Just don't make schema decisions that block it later.
The current `users.plan` column can stay — just add a `team_id` FK later.

---

## UI Architecture — How to Structure V2

### Current route structure (V1):
```
/             → landing page
/app          → tool (single page)
/dashboard    → usage + history
/sign-in      → auth
/sign-up      → auth
/build        → case study
```

### Proposed V2 route structure:
```
/             → landing page (unchanged)
/app          → NEW: sidebar layout shell
/app/new      → new reply (current /app tool)
/app/[id]     → view a specific reply from history
/app/settings → account settings
/app/settings/profile    → business profile setup
/app/settings/tones      → custom tone manager
/app/settings/plan       → plan + usage + billing
/sign-in      → unchanged
/sign-up      → unchanged
/build        → unchanged
```

The `/app` route becomes a layout with a sidebar.
Everything under `/app/*` lives inside that layout.

---

## Production Scaling Considerations

### What breaks at scale and how to fix it:

#### 1. Groq rate limits
**Problem:** Free tier has low RPM (requests per minute) limits.
At 100 concurrent users, requests will start failing.

**Fix:**
- Add retry logic with exponential backoff in `lib/groq.ts`
- Queue requests using Upstash Queue (serverless, free tier)
- Upgrade to Groq paid plan when needed (~$0.59 per million tokens)
- Fallback model: switch to `llama-3.1-8b-instant` if 70b is rate-limited

#### 2. Supabase connection pooling
**Problem:** Each serverless function creates a new DB connection.
At scale, you'll hit connection limits (Supabase free = 60 connections).

**Fix:**
- Use Supabase's built-in connection pooler (PgBouncer) — just change the DB URL
- Switch from direct connection to pooler URL in `lib/supabase.ts`
- Supabase automatically handles this on Pro plan

#### 3. No error monitoring
**Problem:** When something breaks in production, you won't know until a user tells you.

**Fix:**
- Add Sentry (free tier) — `npm install @sentry/nextjs`
- Wrap API routes with Sentry error capture
- Set up alerts for 5xx errors

#### 4. No rate limiting on API routes
**Problem:** A single user (or bot) can hammer `/api/generate` infinitely.
Even with plan limits, they can spam until they hit the DB.

**Fix:**
- Add Upstash Redis rate limiting — `npm install @upstash/ratelimit @upstash/redis`
- Limit: 10 requests per minute per IP
- 2-line middleware addition

```typescript
// In /api/generate — add before auth check:
const { success } = await ratelimit.limit(ip)
if (!success) return 429 Too Many Requests
```

#### 5. No caching
**Problem:** `/api/usage` and `/dashboard` query the DB on every request.
At scale, these become hot paths.

**Fix:**
- Cache usage data in Next.js fetch cache or Upstash Redis
- `revalidate: 60` on the usage API — stale by 60 seconds is fine
- Dashboard page: add `export const revalidate = 30`

#### 6. Slow cold starts
**Problem:** Vercel serverless functions have cold starts (~200ms).
For a tool that should feel instant, this hurts perceived performance.

**Fix:**
- Use Vercel Edge Functions for lightweight routes like `/api/usage`
- Keep heavy routes (Groq calls) on Node.js runtime
- Add `export const runtime = 'edge'` to simple routes

---

## Feature Priority Order

Build in this order. Each tier adds real value before moving to the next.

### Tier 1 — Core UX improvement (do first)
1. **Platform selector** (WhatsApp / Email / DM etc.) — highest user value, 1 day to build
2. **Inline reply editor** — remove friction between AI output and copy-paste
3. **Sidebar layout** — makes the app feel like a real workspace

### Tier 2 — Personalization
4. **Business profile** — custom context for every prompt
5. **Custom tone presets** — power user feature, reduces repetitive selection

### Tier 3 — Production hardening
6. **Rate limiting** (Upstash) — security
7. **Error monitoring** (Sentry) — observability
8. **Connection pooling** — DB stability at scale

### Tier 4 — Growth
9. **Team / multi-seat** — enterprise tier
10. **Payments** (Razorpay/Lemon Squeezy) — monetization

---

## What to Confirm Before Building

Before adding any of this to MASTER_PLAN.md, confirm:

- [ ] **Sidebar layout** — yes / no / different approach?
- [ ] **Platform selector** — which platforms to include at launch?
- [ ] **Business profile** — how much detail? Just industry + tone, or full setup?
- [ ] **Custom tones** — include AI assistant to help build them, or manual only?
- [ ] **Inline editor** — editable text area, or keep copy-only?
- [ ] **Rate limiting** — Upstash (managed) or roll our own?
- [ ] **Error monitoring** — Sentry, or defer?

Review this, mark what you want to build, and I'll merge confirmed features into MASTER_PLAN.md with the full implementation details.
