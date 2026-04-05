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

## Complete Todo List — Every Step to Build V3

Work through this in order. Do not skip ahead.
Each checkbox is one atomic task. Check it off before moving to the next.

---

### PHASE A — Database Migration
> Do this first. Everything depends on the schema being correct.

- [ ] Open Supabase SQL Editor
- [ ] Create `businesses` table (full SQL from Database Schema section above)
- [ ] Create `custom_platforms` table (full SQL from Database Schema section above)
- [ ] Run `ALTER TABLE usage ADD COLUMN business_id uuid REFERENCES businesses(id) ON DELETE CASCADE`
- [ ] Run `ALTER TABLE usage DROP CONSTRAINT usage_user_id_month_key`
- [ ] Run `ALTER TABLE usage ADD CONSTRAINT usage_user_business_month_key UNIQUE(user_id, business_id, month)`
- [ ] Run `ALTER TABLE reply_history ADD COLUMN business_id uuid REFERENCES businesses(id) ON DELETE SET NULL`
- [ ] Run `ALTER TABLE reply_history ADD COLUMN platform text DEFAULT 'dm'`
- [ ] Run `ALTER TABLE reply_history ADD COLUMN thread_context text`
- [ ] Run `ALTER TABLE reply_history ADD COLUMN was_edited boolean DEFAULT false`
- [ ] Run `ALTER TABLE reply_history ADD COLUMN resolution text CHECK (resolution IN ('resolved','ongoing','worse'))`
- [ ] Run `ALTER TABLE reply_history ADD COLUMN resolution_at timestamptz`
- [ ] Run `ALTER TABLE reply_history ADD COLUMN resolution_email_sent boolean DEFAULT false`
- [ ] Verify all new tables appear in Supabase Table Editor
- [ ] Verify all new columns appear in usage and reply_history tables
- [ ] Confirm existing V1 data is untouched (check users, old reply_history rows still there)

---

### PHASE B — Backend: Business API Routes

**Install new dependency first:**
```bash
npm install zustand
```

**B1 — lib/businesses.ts (helper functions)**
- [ ] Create `src/lib/businesses.ts`
- [ ] Add `getBusinesses(userId)` — fetch all businesses for a user
- [ ] Add `getBusiness(businessId, userId)` — fetch one business (verify ownership)
- [ ] Add `createBusiness(userId, data)` — insert new business row
- [ ] Add `updateBusiness(businessId, userId, data)` — update business row
- [ ] Add `deleteBusiness(businessId, userId)` — delete business row

**B2 — POST /api/businesses**
- [ ] Create `src/app/api/businesses/route.ts`
- [ ] GET handler — return all businesses for logged-in user
- [ ] POST handler — create new business, validate name is not empty, return created row

**B3 — PUT + DELETE /api/businesses/[id]**
- [ ] Create `src/app/api/businesses/[id]/route.ts`
- [ ] PUT handler — update business fields, verify user owns this business
- [ ] DELETE handler — delete business, verify user owns it, check no active history

**B4 — POST /api/businesses/scrape**
- [ ] Create `src/app/api/businesses/scrape/route.ts`
- [ ] Accept `{ url: string }` in request body
- [ ] Validate URL is a valid http/https URL
- [ ] Fetch `https://r.jina.ai/${url}` with a 10s timeout
- [ ] Truncate response to 3000 characters
- [ ] Return `{ content: string }` — do NOT store this anywhere
- [ ] Handle errors: invalid URL, timeout, Jina unreachable

**B5 — POST /api/businesses/transcribe**
- [ ] Create `src/app/api/businesses/transcribe/route.ts`
- [ ] Accept audio blob as `multipart/form-data`
- [ ] Send to Groq Whisper API: `groq.audio.transcriptions.create({ file, model: 'whisper-large-v3' })`
- [ ] Return `{ transcript: string }`
- [ ] Handle errors: file too large (max 25MB), unsupported format, Groq error
- [ ] Do NOT store the audio file — only the transcript is returned

**B6 — POST /api/businesses/generate-profile**
- [ ] Create `src/app/api/businesses/generate-profile/route.ts`
- [ ] Accept `{ websiteContent?: string, transcript?: string, businessName: string, industry: string }`
- [ ] Build a Groq prompt combining all inputs (see Prompt Engineering section)
- [ ] Call Groq with `llama-3.3-70b-versatile`
- [ ] Parse JSON response: `{ description, tone_instruction, common_complaints[], brand_words[] }`
- [ ] Return parsed object to frontend
- [ ] Handle JSON parse errors with a fallback

**B7 — Update /api/generate**
- [ ] Open `src/app/api/generate/route.ts`
- [ ] Add `businessId` to the request body destructuring
- [ ] Fetch the business from Supabase: `getBusiness(businessId, userId)`
- [ ] If business not found or doesn't belong to user → return 403
- [ ] Pass `business` object to `buildPrompt()`
- [ ] Add `business_id` field when saving to `reply_history`
- [ ] Update `incrementUsage()` call to pass `businessId`

**B8 — Update lib/usage.ts**
- [ ] Update `incrementUsage(userId, businessId)` to include `businessId` in the upsert
- [ ] Update `getUsage(userId, businessId)` to filter by both userId and businessId
- [ ] Update `checkLimit(userId, businessId)` to use the updated getUsage
- [ ] Update `increment_usage` Postgres function in Supabase SQL Editor:
  ```sql
  CREATE OR REPLACE FUNCTION increment_usage(p_user_id text, p_business_id uuid, p_month text)
  RETURNS void AS $$
  BEGIN
    INSERT INTO usage (user_id, business_id, month, reply_count)
    VALUES (p_user_id, p_business_id, p_month, 1)
    ON CONFLICT (user_id, business_id, month)
    DO UPDATE SET reply_count = usage.reply_count + 1;
  END;
  $$ LANGUAGE plpgsql;
  ```

**B9 — Custom Platforms API**
- [ ] Create `src/app/api/platforms/route.ts`
- [ ] GET handler — return default platforms list + custom platforms for given businessId
- [ ] POST handler — create custom platform, validate businessId ownership

- [ ] Create `src/app/api/platforms/[id]/route.ts`
- [ ] PUT handler — update custom platform
- [ ] DELETE handler — delete custom platform

- [ ] Create `src/app/api/platforms/generate/route.ts`
- [ ] Accept `{ description: string, businessId: string }`
- [ ] Call Groq: convert plain English description into a structured prompt instruction
- [ ] Return `{ instruction: string }`

---

### PHASE C — Business Context Store (Client-Side State)

- [ ] Create `src/store/businessStore.ts` using Zustand
  ```typescript
  // Store: active business ID + business list
  // Persisted to localStorage so selection survives page refresh
  ```
- [ ] Export `useBusinessStore` hook with:
  - `activeBusiness: Business | null`
  - `businesses: Business[]`
  - `setActiveBusiness(business: Business)`
  - `setBusinesses(businesses: Business[])`
- [ ] Add `persist` middleware from Zustand so `activeBusiness` survives refresh

---

### PHASE D — Business Onboarding UI

**D1 — Business list page**
- [ ] Create `src/app/app/businesses/page.tsx`
- [ ] Fetch all businesses for logged-in user
- [ ] Show grid of business cards: name, industry, date created
- [ ] Each card has Edit and Delete buttons
- [ ] "Add new business" button → links to `/app/businesses/new`
- [ ] Empty state: illustration + "Create your first business" CTA

**D2 — Business creation: Step 1 (Basic info)**
- [ ] Create `src/app/app/businesses/new/page.tsx`
- [ ] Step 1 UI: business name input, industry input, website URL input (optional)
- [ ] Progress indicator showing Step 1 of 3
- [ ] Validate: name required (min 2 chars), industry required
- [ ] "Next" button → moves to Step 2
- [ ] Store step 1 data in local component state (not DB yet)

**D3 — Business creation: Step 2 (Voice or text)**
- [ ] Step 2 UI: two options side by side
- [ ] **Option A — Record voice note:**
  - [ ] "Start Recording" button using browser `MediaRecorder` API
  - [ ] Show live recording timer (max 60 seconds, auto-stop)
  - [ ] "Stop" button to end recording early
  - [ ] After recording: show waveform or "Recording complete (0:42)" confirmation
  - [ ] "Re-record" option if they want to try again
  - [ ] On "Next": POST audio blob to `/api/businesses/transcribe`, show loading spinner
- [ ] **Option B — Type it out:**
  - [ ] Textarea with placeholder: "Describe your business and how you communicate with customers..."
  - [ ] Min 50 characters before "Next" is enabled
- [ ] "Skip this step" link — they can add context later from settings

**D4 — Business creation: Step 3 (AI processing + review)**
- [ ] While loading:
  - [ ] Show animated processing screen: "Analysing your website... Generating your business profile..."
  - [ ] Behind the scenes: call `/api/businesses/scrape` (if URL provided) then `/api/businesses/generate-profile`
- [ ] After loading: show the generated profile for review
  - [ ] Editable field: Business description (2 sentences)
  - [ ] Editable field: Communication tone
  - [ ] Editable chips: Common complaint types (can add/remove)
  - [ ] User can edit any field before saving
- [ ] "Create business" button → POST to `/api/businesses`, redirect to `/app`
- [ ] On success: set this new business as active in Zustand store

**D5 — Business switcher component**
- [ ] Create `src/components/BusinessSwitcher.tsx`
- [ ] Dropdown showing active business name with chevron icon
- [ ] Opens to show all businesses with radio-style selection
- [ ] "Manage businesses" link at bottom → `/app/businesses`
- [ ] "Add new business" link → `/app/businesses/new`
- [ ] On selection: update Zustand store, store in localStorage
- [ ] Place this at the very top of `src/app/app/page.tsx`

**D6 — Hard gate: no business, no tool**
- [ ] In `src/app/app/page.tsx`:
  - [ ] Fetch user's businesses on page load
  - [ ] If `businesses.length === 0` → show onboarding screen instead of tool
  - [ ] Onboarding screen: headline, description, "Create your first business →" button
  - [ ] If businesses exist → show tool with BusinessSwitcher at top

**D7 — Edit business page**
- [ ] Create `src/app/app/businesses/[id]/page.tsx`
- [ ] Pre-fill form with existing business data
- [ ] Same fields as creation: name, industry, website URL, description, tone, common complaints
- [ ] "Re-scrape website" button — re-runs scrape + profile generation
- [ ] "Save changes" button → PUT to `/api/businesses/[id]`
- [ ] "Delete business" button with confirmation dialog

---

### PHASE E — Custom Platforms UI

- [ ] Create `src/app/app/businesses/[id]/platforms/page.tsx`
- [ ] Show list of default platforms (read-only, cannot delete)
- [ ] Show list of user's custom platforms for this business
- [ ] Each custom platform: name, icon, instruction preview, Edit / Delete buttons

- [ ] **Add custom platform form:**
  - [ ] Name input
  - [ ] Icon picker (emoji selector, 8 options)
  - [ ] Instruction textarea (write manually)
  - [ ] OR: "Describe it in plain English" textarea + "Generate instruction" button
    - [ ] On click: POST to `/api/platforms/generate`, show loading, fill instruction field with result
  - [ ] User can edit generated instruction before saving
  - [ ] "Save platform" → POST to `/api/platforms`

- [ ] Link to platforms page from business edit page: "Manage platforms →"

---

### PHASE F — Wire Everything Together

- [ ] Update `src/components/ReplyGenerator.tsx`:
  - [ ] Remove hardcoded `BIZ_TYPES` array (replaced by business context)
  - [ ] Read active business from Zustand store
  - [ ] Pass `businessId` in every `/api/generate` POST request
  - [ ] Show selected business name above the textarea: "Replying as: Photography Studio"

- [ ] Update `src/components/UsageBadge.tsx`:
  - [ ] Pass `businessId` to `/api/usage` GET request
  - [ ] Show usage scoped to selected business

- [ ] Update `src/app/dashboard/page.tsx`:
  - [ ] Add business filter: "All businesses" dropdown + individual business filter
  - [ ] Default: show history for all businesses
  - [ ] Each history card shows which business it was generated for

- [ ] Update `src/app/api/usage/route.ts`:
  - [ ] Accept `businessId` as query param
  - [ ] Filter usage query by businessId

- [ ] Update middleware to protect `/app/businesses` routes

---

### PHASE G — V2 Features (build on top of V3 foundation)

Now that `business_id` exists everywhere, build these in order:

**G1 — Platform Selector**
- [ ] Create `src/components/PlatformSelector.tsx`
- [ ] Fetch default + custom platforms from `/api/platforms?businessId=xxx`
- [ ] Render as icon row: default platforms + custom platforms inline
- [ ] Pass selected platform to `/api/generate`
- [ ] Update `buildPrompt()` in `src/lib/prompts.ts` with platform instructions

**G2 — Thread Mode**
- [ ] Add toggle to `ReplyGenerator`: "Single message" / "Full conversation"
- [ ] When full conversation: second textarea appears for thread context
- [ ] Pass `threadContext` to `/api/generate`
- [ ] Update `buildPrompt()` to handle thread context

**G3 — Inline Reply Editor**
- [ ] Update `ReplyCard.tsx`: text becomes editable on click
- [ ] "Copy edited version" replaces "Copy" while editing
- [ ] On copy after edit: PATCH `/api/reply-history/[id]` to set `was_edited = true`

**G4 — Quick Templates**
- [ ] Create `src/components/QuickTemplates.tsx`
- [ ] Add `quick_templates jsonb` column to `businesses` table (not users — scoped per business)
- [ ] Fetch templates from business profile
- [ ] Render as chips below textarea
- [ ] "Save as template" button after generation

**G5 — Resolution Tracking**
- [ ] Create `src/app/api/resolve/route.ts`
- [ ] Create `src/app/api/cron/resolution-emails/route.ts`
- [ ] Create `vercel.json` with cron schedule
- [ ] Create resolution email HTML template in `src/lib/resend.ts`
- [ ] Update dashboard to show resolution rate

---

### PHASE H — Final QA Before Launch

- [ ] Test creating a business with website URL — verify profile is generated correctly
- [ ] Test creating a business with voice note — verify transcription works
- [ ] Test creating a business with neither — verify manual text fallback works
- [ ] Test switching between 2 businesses — verify replies use correct context
- [ ] Test custom platform creation (manual) — verify it appears in selector
- [ ] Test custom platform creation (AI-generated) — verify instruction makes sense
- [ ] Test generating a reply — verify business context is in the output
- [ ] Test usage tracking — verify count increments correctly per business
- [ ] Test deleting a business — verify history is preserved (SET NULL, not CASCADE)
- [ ] Test hard gate — sign up fresh, verify tool is blocked until business created
- [ ] Test on mobile — every page
- [ ] Test in Chrome, Firefox, Safari
- [ ] Run `npx tsc --noEmit` — zero TypeScript errors
- [ ] Deploy to Vercel — smoke test production

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
