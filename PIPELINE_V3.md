# ReplyAI — V3 Pipeline Architecture
> This document defines the foundational data model and feature pipeline.
> Build this BEFORE any V2 features. Everything in V2 will be rebuilt on top of this.
> Confirm this document fully before writing a single line of code.

---

## The Core Shift

V1 model:     User → generates replies
V2 model:     User → Business Profile → generates replies
V3 model:     User → multiple Businesses → each Business has its own context, platforms, filters → generates replies

This is not just a feature addition. It's a data model change.
If you build V2 features on the V1 model and then try to add multi-business later,
you will have to rewrite almost everything. Do this first.

---

## The Mental Model — Think Clerk Projects

Clerk lets one developer account manage multiple projects.
Each project has its own API keys, settings, and users.
The developer switches between projects in the sidebar.

ReplyAI equivalent:
- One account for "Sahil"
- Sahil has 3 businesses: "Photography Studio", "Dropship Store", "Freelance Dev"
- Each business has its own voice, platforms, custom filters, and reply history
- When Sahil opens the app, he selects which business he's replying as
- Every reply generated is scoped to that business

The selected business is the context engine for the entire AI prompt.
Without it selected, you cannot generate.

---

## New Database Schema (V3 Foundation)

### What changes from V1:
- `users` table — stays, but loses `business_profile` and `quick_templates` columns
- `usage` table — add `business_id` FK so usage is tracked per business
- `reply_history` table — add `business_id` FK so history is scoped per business
- `businesses` table — NEW (the core of V3)
- `custom_platforms` table — NEW (user-defined filters)

### New table: businesses

```sql
CREATE TABLE businesses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              text NOT NULL,
  slug              text NOT NULL,                  -- URL-friendly name e.g. "photography-studio"
  website_url       text,                           -- Optional: scraped to extract brand voice
  industry          text,                           -- "Wedding photography", "Dropshipping" etc.
  description       text,                           -- AI-generated from website + voice note
  raw_voice_transcript text,                        -- Raw Whisper transcription of voice note
  tone_instruction  text,                           -- Final extracted tone: "Warm, professional, always offer solutions"
  common_complaints text[],                         -- Array: ["Late delivery", "Wrong item"] etc.
  logo_url          text,                           -- Optional: user uploaded logo
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),

  UNIQUE(user_id, slug)                             -- No two businesses with same slug per user
);

CREATE INDEX ON businesses(user_id);
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_owner_only" ON businesses
  FOR ALL USING (user_id = auth.uid()::text);
```

### Modified table: usage (add business_id)

```sql
ALTER TABLE usage
  ADD COLUMN business_id uuid REFERENCES businesses(id) ON DELETE CASCADE;

-- Usage is now tracked per user per business per month
-- Old unique constraint: UNIQUE(user_id, month)
-- New unique constraint:
ALTER TABLE usage DROP CONSTRAINT usage_user_id_month_key;
ALTER TABLE usage ADD CONSTRAINT usage_user_business_month_key
  UNIQUE(user_id, business_id, month);
```

### Modified table: reply_history (add business_id + platform)

```sql
ALTER TABLE reply_history
  ADD COLUMN business_id        uuid REFERENCES businesses(id) ON DELETE SET NULL,
  ADD COLUMN platform           text DEFAULT 'dm',
  ADD COLUMN thread_context     text,
  ADD COLUMN was_edited         boolean DEFAULT false,
  ADD COLUMN resolution         text CHECK (resolution IN ('resolved','ongoing','worse')),
  ADD COLUMN resolution_at      timestamptz,
  ADD COLUMN resolution_email_sent boolean DEFAULT false;
```

### New table: custom_platforms

This is the custom filter system — user-defined platforms/contexts.
Each business can have its own set of custom platforms on top of the defaults.

```sql
CREATE TABLE custom_platforms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text NOT NULL,                   -- Display name: "My Shopify Store DM"
  icon         text DEFAULT '💬',               -- Emoji icon for the UI
  instruction  text NOT NULL,                   -- The actual prompt injection:
                                                -- "Format as a Shopify order message.
                                                --  Always mention order number.
                                                --  Keep under 100 words."
  is_ai_generated boolean DEFAULT false,        -- Was this instruction written by AI or user?
  created_at   timestamptz DEFAULT now(),

  UNIQUE(business_id, name)
);

ALTER TABLE custom_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_owner_only" ON custom_platforms
  FOR ALL USING (user_id = auth.uid()::text);
```

---

## Business Onboarding Flow

When a user creates a new business, we collect information in 3 steps.
The goal: by the end of step 3, we have enough context to make every
AI reply sound like it came from that specific business.

### Step 1 — Basic Info (30 seconds)
```
What's your business name?
[Photography Studio by Sahil          ]

What do you sell or do?
[Wedding & event photography          ]

Website URL (optional — we'll extract your brand voice automatically)
[https://sahilphotography.com         ]
```

### Step 2 — Voice Note OR Text (user chooses)

Two options presented side by side:

**Option A — Record a voice note (60 seconds max)**
"Tell us about your business in your own words.
How do you talk to customers? What's your vibe?
What kinds of complaints do you usually get?"

→ User hits record button in browser
→ Audio captured via MediaRecorder API
→ Sent to Groq Whisper API for transcription
→ Raw transcript stored in `businesses.raw_voice_transcript`

**Option B — Type it out**
"Describe your business and how you communicate with customers."
[Multi-line textarea]

**Why voice?**
Most small business owners are better at talking than typing.
A 60-second voice note captures personality, tone, and specific details
that a typed form never gets. This is a genuine differentiator.

### Step 3 — AI Processing (happens automatically)
After step 2, the backend does this silently while showing a loading screen:

1. **If website URL provided:**
   - Fetch `https://r.jina.ai/{website_url}` — Jina Reader API converts any URL to clean markdown (free, no API key needed)
   - Extract: business name confirmation, product descriptions, existing tone from their copy, any social proof language

2. **If voice note provided:**
   - Call Groq Whisper API to transcribe audio to text
   - Store raw transcript

3. **Combine everything and call Groq to generate:**
```
Given this information about a business:

Website content: [extracted markdown, truncated to 2000 chars]
Owner's voice note / description: [transcript or typed text]

Generate a structured business context object with:
1. A 2-sentence business description for AI context
2. The owner's communication tone in one sentence (e.g. "Warm and direct, always offers a concrete solution, never gets defensive")
3. Up to 5 common complaint types based on their industry and description
4. 3 words that describe their brand personality

Return ONLY valid JSON:
{
  "description": "...",
  "tone_instruction": "...",
  "common_complaints": ["...", "..."],
  "brand_words": ["...", "...", "..."]
}
```

4. Save the generated fields to the `businesses` table

Result: User gets a business profile they didn't have to manually fill in.
They just talked for 60 seconds.

---

## Custom Platform / Filter System

### Default platforms (built-in, same for all businesses):
- DM / Chat (default)
- WhatsApp
- Email
- Google Review
- Facebook
- Instagram
- Etsy / Marketplace
- SMS

### Custom platforms (per business, user-defined):
User can add their own. Example:
- "Shopify Order Message" — with a custom instruction they write
- "TrustPilot Review Response" — with SEO-aware instructions
- "Airbnb Host Response" — with hospitality-specific tone

### Two ways to create a custom platform:

**Way 1 — Write it manually:**
```
Platform name: [Shopify Order Message         ]
Icon:          [🛍️]
Instruction:   [This is a Shopify order message. Always reference 
                the specific issue. Mention the resolution timeline.
                Keep it under 120 words. Professional but friendly.]
```

**Way 2 — AI generates the instruction:**
User types a short description in plain English:
"I reply to reviews on TrustPilot. They're public. I want to sound professional and show future customers I care."

→ Click "Generate instruction"
→ Groq converts plain English into a structured prompt instruction
→ User sees the generated instruction, can edit it, then saves

This is the key insight: most users can describe what they want in plain English
but cannot write a good prompt. We bridge that gap.

---

## How Business Context Gets Injected Into Prompts

Every time a user generates a reply, the full business context is appended:

```typescript
function buildBusinessContext(business: Business): string {
  if (!business) return ''

  return `
BUSINESS CONTEXT (use this to personalize every reply):
Business: ${business.name} — ${business.industry}
Description: ${business.description}
Communication style: ${business.tone_instruction}
${business.common_complaints?.length
  ? `Common complaints they handle: ${business.common_complaints.join(', ')}`
  : ''}
Brand personality: ${business.brand_words?.join(', ') || ''}

Every reply must sound like it came from this specific business.
Match their voice. Don't sound generic.
`
}
```

This replaces the static `bizType` dropdown. Instead of "Etsy shop" (generic),
the AI gets "Sahil's Photography Studio — a wedding photography business in Pune
that communicates warmly and always offers concrete solutions."

The difference in output quality is dramatic.

---

## UI Architecture — Business Switcher

### Where the switcher lives:
Top of the `/app` page, above everything else.

```
┌─────────────────────────────────────────────────────────┐
│ [📷 Photography Studio ▼]  [+ Add business]             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Reply Generator — scoped to selected business]        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

The selected business is stored in:
1. React state (for the current session)
2. localStorage (so it persists between sessions)
3. Every API call includes `businessId` in the request body

### Business switcher dropdown:
```
📷 Photography Studio          ← currently selected
🛍️ Dropship Store
💻 Freelance Dev
─────────────────
+ Add new business
```

### First-time user (no businesses yet):
Show an onboarding screen instead of the tool:
"Before you generate your first reply, tell us about your business.
It takes 2 minutes and makes every reply sound like you."
[Create your first business →]

Cannot access the tool until at least one business is created.
This is a hard gate — not a soft suggestion.

---

## Route Structure (V3)

```
/app                          → tool page (requires active business)
/app/businesses               → list of user's businesses
/app/businesses/new           → create new business (3-step onboarding)
/app/businesses/[id]          → edit business profile
/app/businesses/[id]/platforms → manage custom platforms for this business
/dashboard                    → usage + history (scoped to selected business or all)
/settings                     → account settings (not business settings)
```

---

## API Routes (V3)

```
POST /api/businesses              → create new business
GET  /api/businesses              → list user's businesses
PUT  /api/businesses/[id]         → update business
DELETE /api/businesses/[id]       → delete business

POST /api/businesses/scrape       → scrape website URL, return extracted content
POST /api/businesses/transcribe   → receive audio blob, return Whisper transcription
POST /api/businesses/generate-profile → take scraped + transcript, return structured profile JSON

GET  /api/platforms               → list default + custom platforms for active business
POST /api/platforms               → create custom platform
PUT  /api/platforms/[id]          → update custom platform
DELETE /api/platforms/[id]        → delete custom platform
POST /api/platforms/generate      → AI generates instruction from plain English description

POST /api/generate                → updated: now requires businessId in body
```

---

## Scalability Considerations

### 1. Website scraping at scale
Jina Reader API (`r.jina.ai/{url}`) is free and requires no API key.
At scale (1000+ businesses being created per day), rate limits may apply.
Fallback: Firecrawl (paid, $16/month) or cache scraped content in Supabase.
The scraped content is stored nowhere — only the AI-generated description is stored.

### 2. Voice note processing
Audio blobs are sent directly from browser to `/api/businesses/transcribe`.
Groq Whisper API handles transcription. Free tier supports 2 hours of audio per day.
At scale: upgrade to Groq paid tier or use AssemblyAI ($0.37/hour of audio).
Audio is never stored — only the transcript is stored.

### 3. Multi-business usage tracking
Usage limits apply per user account, not per business.
A free user with 3 businesses still gets 10 replies total per month.
This is intentional: businesses don't each get their own free tier.
The limit is designed to encourage upgrade, not to be per-business.

### 4. Business context in prompts
Each business context adds ~300-500 tokens to every prompt.
At scale this increases Groq API costs.
Mitigation: truncate `description` to 500 chars and `tone_instruction` to 200 chars.
The quality impact is minimal — LLMs don't need paragraphs, they need precision.

### 5. Real-time business switching
When user switches between businesses, the platform list and history update instantly.
This is a client-side state change — no page reload.
Use React Context or Zustand to store the active business across components.

---

## Build Order — Do This Exactly

**Do NOT build V2 features (platform selector, thread mode, etc.) until this is done.**
Every V2 feature depends on `business_id` existing in the schema.
If you build platform selector first, you'll have to add `business_id` later and
retrofit every table, every API route, and every query. That's rewriting everything.

### Step 1 — Database migration (30 minutes)
Run all SQL from this document in Supabase SQL Editor.
Verify all new tables and columns appear correctly.
Do not touch existing V1 data.

### Step 2 — Backend API routes (1 day)
Build all `/api/businesses/*` routes.
Build Jina scraping endpoint.
Build Groq Whisper transcription endpoint.
Build profile generation endpoint.
Update `/api/generate` to require and use `businessId`.

### Step 3 — Business onboarding UI (1 day)
Build 3-step business creation flow at `/app/businesses/new`.
Build business switcher component.
Add hard gate: cannot access tool without at least one business.

### Step 4 — Custom platforms UI (half day)
Build platform list at `/app/businesses/[id]/platforms`.
Build manual creation form.
Build AI instruction generator.

### Step 5 — Wire everything together (half day)
Connect business switcher to `/api/generate`.
Scope reply history to selected business.
Scope usage badge to selected business.

### Step 6 — NOW build V2 features on top of this foundation
Platform selector, thread mode, resolution tracking, etc.
All of these now work cleanly because `business_id` exists everywhere.

---

## What This Changes for the User

### V1 experience:
1. Open app
2. Select tone (Empathetic / Firm / Apologetic / Professional)
3. Select business type (Etsy shop / Shopify / Freelancer / etc.)
4. Paste complaint
5. Get 3 generic replies that sound like any business

### V3 experience:
1. Open app — Photography Studio is already selected (remembered from last session)
2. Paste complaint (tone is pre-set to their saved preference)
3. Select platform (WhatsApp / Google Review / Email — or their custom "Shopify DM")
4. Get 3 replies that sound exactly like Sahil's Photography Studio

The user makes zero setup decisions on the generate screen once their business is created.
The cognitive load drops from 4 decisions to 1 decision (platform).
Time to relief drops dramatically.

---

## Confirmation Checklist

Before starting any code, confirm these decisions:

- [ ] Multi-business: yes — hard gate, must create business before using tool
- [ ] Voice note input: yes / no / optional?
- [ ] Website scraping via Jina: yes / no?
- [ ] Custom platforms: yes — both manual and AI-generated
- [ ] Usage limits: per account (not per business) — confirm
- [ ] Business switcher location: top of /app page — confirm
- [ ] Business creation as mandatory onboarding — confirm hard gate
- [ ] Build order: database → API → UI → then V2 features — confirm

Confirm all items above. Then we write the SQL and start building.
