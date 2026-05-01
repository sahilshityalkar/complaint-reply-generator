# ReplyAI — Agent Context File

> Single source of truth for AI agents working on this project.
> Read this first before making any changes.

---

## Product Overview

**ReplyAI** is a micro-SaaS that converts customer complaints into 3 professional, ready-to-send replies in under 5 seconds. Targeted at small business owners (Etsy sellers, freelancers, Shopify stores) who freeze when they get rude customer messages.

**Core flow:** Paste complaint → choose tone → click generate → 3 replies → copy & send.

**Brand Voice:** Users save their brand personality (via website URL, quiz, template, or manual setup). Every reply is automatically written in THEIR voice.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16 (App Router) | Full-stack, no separate backend |
| Language | TypeScript 5 | Type safety |
| Styling | Tailwind CSS v4 | Utility-first, no CSS files |
| Auth | Clerk (email + Google) | Pre-built auth, webhook sync |
| Database | Supabase (PostgreSQL) | RLS, auto-dashboard, free tier |
| AI | Groq SDK (llama-3.3-70b-versatile) | Free tier, <1s inference |
| Email | Resend | Transactional emails (3k/mo free) |
| Hosting | Vercel | Auto-deploy from GitHub |
| Package Manager | npm | |

## Current Build Status ✅

| Phase | What's Built | Status |
|-------|-------------|--------|
| Scaffold | Next.js 16 + Tailwind + TypeScript + deps | ✅ Done |
| Core AI | Groq client, POST /api/generate, prompt engineering | ✅ Done |
| Database | Supabase project, users/usage/reply_history tables, RLS, atomic increment | ✅ Done |
| Auth | Clerk UI pages, middleware, webhook handler | ✅ Done |
| Landing Page | Hero, demo section, features, pricing, CTA, footer | ✅ Done |
| UX Polish | UsageBadge, UpgradeModal, toast notifications, character counter | ✅ Done |
| Reply History | reply_history table, fire-and-forget save, dashboard display | ✅ Done |
| Build Page | Full engineering case study / marketing page | ✅ Done |
| **Brand Voice** | Profiles, setup wizard, prompt injection, voice DNA gen | ✅ Done |
| **Send Reply via Email** | Resend API, POST /api/email/send, one-click send button | ✅ Done |
| **Sidebar Layout** | Replaced top navbar with sidebar nav + plan badge + user | ✅ Done |
| **Domain Setup** | replies.mockjee.com verified in Resend, DNS configured | ✅ Done |

### What's NOT Built Yet (Future Phases)

| Area | Notes |
|------|-------|
| **Payments** | Deferred by design. Razorpay or Lemon Squeezy preferred for India |
| **Email notifications** | Resend installed, not wired |
| **Reply via email** | Send replies directly via Resend |
| **Reply history search** | Search past complaints/replies |
| **Multi-language** | Schema supports it (JSONB), implementation is next |
| **Analytics** | Not installed |
| **Error tracking** | Not set up |
| **Testing** | No test suite exists |

## Project Structure

```
complaint-reply-generator/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout with ClerkProvider
│   │   ├── globals.css                 # Tailwind entry
│   │   ├── middleware.ts               # Clerk auth middleware
│   │   │
│   │   ├── app/
│   │   │   ├── page.tsx                # Main tool page (protected)
│   │   │   └── voice-setup/
│   │   │       └── page.tsx            # 🆕 Brand voice setup wizard
│   │   │
│   │   ├── sign-in/[[...sign-in]]/
│   │   │   └── page.tsx
│   │   ├── sign-up/[[...sign-up]]/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx                # Usage meter + reply history
│   │   ├── build/
│   │   │   └── page.tsx                # Case study
│   │   │
│   │   └── api/
│   │       ├── generate/route.ts       # POST — AI reply (now with brand voice)
│   │       ├── usage/route.ts          # GET — usage data
│   │       ├── webhooks/clerk/route.ts # POST — Clerk user sync
│   │       └── voice/
│   │           ├── profiles/
│   │           │   ├── route.ts        # 🆕 GET/POST brand profiles
│   │           │   └── [id]/route.ts   # 🆕 GET/PATCH/DELETE profile
│   │           └── generate-dna/
│   │               └── route.ts        # 🆕 POST generate voice DNA
│   │
│   ├── components/
│   │   ├── ReplyGenerator.tsx          # Main tool (now with profile dropdown)
│   │   ├── VoiceSetupWizard.tsx        # 🆕 4-step brand voice wizard
│   │   ├── ReplyCard.tsx              # Single reply display
│   │   ├── Navbar.tsx                  # Auth-aware nav
│   │   ├── UsageBadge.tsx              # Usage counter
│   │   └── UpgradeModal.tsx            # Limit reached modal
│   │
│   └── lib/
│       ├── voice.ts                    # 🆕 Brand profile CRUD, DNA gen, prompt builder
│       ├── groq.ts                     # Groq client
│       ├── supabase.ts                 # Supabase server client
│       ├── usage.ts                    # User CRUD, usage tracking
│       └── plans.ts                    # Plan limits config
│
├── src/lib/db/
│   ├── 001_brand_profiles.sql          # 🆕 Migration: brand_profiles table
│   ├── 002_reply_history_profile.sql   # 🆕 Migration: add profile_id to history
│   └── README.md                       # 🆕 Migration instructions
│
├── public/
├── AGENTS.md                           # THIS FILE
├── CLAUDE.md
├── IMPLEMENTATION_PLAN.md              # Brand voice implementation plan
├── MASTER_PLAN.md
├── package.json
├── next.config.ts
├── tsconfig.json
└── eslint.config.mjs
```

## Architecture & Data Flow (Updated)

```
Browser (React UI)
  │
  │  GET /api/voice/profiles → load profiles
  │  POST /api/generate { complaint, tone, bizType, profile_id? }
  │
  ▼
/api/generate (Next.js API Route)
  │
  ├── 1. auth() → Clerk → userId
  ├── 2. Load brand profile (if profile_id or default exists)
  ├── 3. Get/create user, check usage limit
  ├── 4. Build prompt with brand voice injection:
  │      └── voice.ts: buildGeneratePrompt()
  │          - Injects voice_dna, sign_off
  │          - Injects style rules (formality, emoji, length)
  │          - Injects custom rules
  ├── 5. groq.chat.completions.create() → 3 replies
  ├── 6. incrementUsage(userId)
  └── 7. supabase.insert(reply_history with profile_id)

/api/voice/generate-dna (POST)
  ├── method=url → Groq analyzes website context → returns voice DNA
  └── method=quiz → Groq generates from keywords/formality/emoji

/api/voice/profiles (GET/POST) — list/create profiles
/api/voice/profiles/[id] (GET/PATCH/DELETE) — manage single profile
```

## Database Schema

### Table: `users`
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | text | PK | Clerk user ID |
| email | text | UNIQUE NOT NULL | |
| plan | text | DEFAULT 'free' | free / starter / pro |
| created_at | timestamptz | DEFAULT now() | |
| stripe_customer_id | text | UNIQUE | null until payment |

### Table: `usage`
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | uuid | PK | gen_random_uuid() |
| user_id | text | FK → users(id) CASCADE | |
| month | text | NOT NULL | '2026-04' format |
| reply_count | integer | DEFAULT 0 | |

### Table: `reply_history`
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | uuid | PK | |
| user_id | text | FK → users(id) | |
| profile_id | uuid | 🆕 FK → brand_profiles(id) | null if no profile used |
| complaint | text | NOT NULL | |
| tone | text | NOT NULL | |
| business_type | text | NOT NULL | |
| replies | jsonb | NOT NULL | |
| created_at | timestamptz | DEFAULT now() | |

### Table: `brand_profiles` 🆕
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | uuid | PK | |
| user_id | text | FK → users(id) CASCADE | |
| name | text | NOT NULL | e.g. "My Etsy Shop" |
| business_name | text | NOT NULL | |
| industry | text | NOT NULL | |
| website_url | text | nullable | |
| voice_dna | text | nullable | Cached AI-generated voice description |
| sign_off | text | nullable | e.g. "- Sarah from Handmade" |
| preferences | jsonb | DEFAULT {...} | Languages, style, rules, signature |
| setup_method | text | DEFAULT 'quiz' | scrape/quiz/template/manual |
| is_default | boolean | DEFAULT false | |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

### RLS Policies
- All tables have RLS enabled
- Users can only access their own rows
- brand_profiles policy: `user_id = auth.uid()::text`

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/generate | Generate 3 replies (optional profile_id) |
| GET | /api/usage | Get current usage count |
| GET | /api/voice/profiles | List all brand profiles |
| POST | /api/voice/profiles | Create a brand profile |
| GET | /api/voice/profiles/[id] | Get single profile |
| PATCH | /api/voice/profiles/[id] | Update profile (+ set_default) |
| DELETE | /api/voice/profiles/[id] | Delete profile |
| POST | /api/voice/generate-dna | Generate voice DNA (url or quiz) |

## Key Design Decisions

1. **Groq over OpenAI/Anthropic** — Free tier, blazing fast, easy to swap (5-line change)
2. **Atomic Postgres function** — Prevents race conditions on usage increment
3. **jsonb for replies** — 3 replies always read together, simpler than joined table
4. **Brand voice is FREE for everyone** — Voice quality sells the product. Conversion comes from usage limits (10/mo free → upgrade)
5. **Voice DNA cached** — Generated ONCE on setup. Never regenerated per reply. Saves Groq tokens.
6. **JSONB preferences** — Add languages, rules, custom fields later without migrations
7. **4 setup methods** — website URL, quiz, template, manual. Covers every business type.
8. **Template + Manual = zero API cost** — No AI generation needed for these methods
9. **Payments deferred** — Ship first, validate, then monetize

## Environment Variables

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
RESEND_API_KEY=         # optional
```

## Development Setup

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Agent Instructions

- Next.js 16 with Turbopack (enabled by default). Do NOT add webpack config without also adding turbopack config.
- All API routes are server-only. No client-side DB access.
- Brand profile loading is additive to /api/generate — backward compatible. Missing profile_id = generic replies.
- Voice DNA is cached on the profile row. The prompt builder reads it, does NOT regenerate it.
- `npm run build` must pass before pushing.
- This project auto-deploys to Vercel from the `main` branch.
- CLAUDE.md delegates to this file (`@AGENTS.md`).
