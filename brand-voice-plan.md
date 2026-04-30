# ReplyAI — Brand Voice Feature Plan (High-Level)

> Goal: Give every user a personalized brand voice that makes their replies sound like THEM, not a generic AI. Voice is free for all plans. Conversion comes from usage volume limits.

---

## The Big Picture

```
User Setup → Brand Voice Saved → Every Reply Uses It → Hits Reply Limit → Upgrades
   (1 time)       (DB)              (habit loop)        (month 2-3)        ($$$)
```

---

## Phase 1: Brand Voice Setup & Storage

### What we're building
A system where users create and manage their brand voice profile(s). Each profile contains their business identity, tone preferences, and AI-extracted "voice DNA."

### Users can set up via:
1. **Website URL** (scrape → AI extracts voice) — premium feel
2. **Quick quiz** (4 simple questions) — for no-website businesses
3. **Industry template** (pick from presets) — fastest onboarding
4. **Manual** (type your own description) — for power users

### Database Changes
- New table: `brand_profiles` (user_id, name, business_name, industry, website_url, voice_dna, sign_off, formality, emoji_style, setup_method)
- New table: `brand_keywords` (profile_id, keyword) — for search/tags
- Update `reply_history` — add `profile_id` column (optional FK)

### UI Pages
1. **Settings / Brand Voice page** — list profiles, create new, edit, delete
2. **Setup wizard** — guided flow (URL → scrape → review, or quiz → review, or template → customize)
3. **Dropdown in ReplyGenerator** — pick active voice profile

### API Endpoints
- `POST /api/voice/setup` — accepts URL or quiz answers → returns AI-generated voice DNA
- `POST /api/voice/scrape` — scrape website → return raw text for review
- `CRUD /api/voice/profiles` — list, create, update, delete profiles
- `GET /api/voice/analyze` — analyze existing reply history for voice DNA

---

## Phase 2: Inject Voice Into Generation

### What changes
The `/api/generate` endpoint already takes complaint + tone + bizType. We add an optional `profile_id`.

### Flow
```
User selects voice profile → submit complaint → API:
  1. Load profile from DB
  2. Inject voice_dna + sign_off + rules into the AI prompt
  3. Generate 3 replies (now in THEIR voice)
  4. Return as before
```

### Prompt Update
Current prompt just says "You are a professional customer service expert..."
New prompt injects:
```
The brand "Handmade with Heart" has this voice:
- Warm, personal, uses "we" and "you"
- Casual but professional
- Occasional emojis
- Sign-off: "- Sarah from Handmade with Heart"
- Key phrases: "quality guaranteed", "our artisans"

Generate 3 replies in THIS brand's voice.
```

---

## Phase 3: Send Reply via Email (Resend)

### What we're building
One-click email sending from the reply card. User enters customer email → clicks "Generate & Send" → reply goes directly.

### Database Changes
- Add `sent_via_email` boolean to `reply_history`
- Maybe a `sent_to_email` column

### UI
- Email input field in ReplyGenerator
- "Send via Email" button on each ReplyCard

### API
- `POST /api/email/send` — takes reply text, customer email, brand name → sends via Resend

---

## Phase 4: Reply History Search

### What we're building
Search bar on the dashboard to search past complaints and replies.

### Implementation Options
1. Supabase full-text search (cheap, built-in)
2. Client-side filter (fast, no API cost)

### UI
- Search input at top of dashboard history
- Real-time filter as user types

---

## Data Flow Diagram

```
                    ┌──────────────────┐
                    │  Brand Profiles  │
                    │  (Supabase)      │
                    └────────┬─────────┘
                             │ voice_dna
                             ▼
┌──────────┐    ┌──────────────────────┐    ┌──────────┐
│  User    │───▶│  POST /api/generate  │───▶│  Groq AI │
│  selects │    │  (injects voice)     │    │  LLM     │
│  voice   │    └──────────┬───────────┘    └──────────┘
└──────────┘               │
                           ▼
                    ┌──────────────────┐
                    │  3 Replies      │
                    │  (in brand voice)│
                    └──────────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │ Copy     │  │ Send via │
              │ Clipboard│  │ Email    │
              └──────────┘  └──────────┘
```

---

## Plan Limits (What Users Pay For)

| Feature | Free | Starter ($9) | Pro ($19) |
|---------|------|-------------|-----------|
| Brand Voice Profiles | 1 | 3 | Unlimited |
| Website Scrape | ✅ | ✅ | ✅ |
| AI Reply Generation | 10/mo | 100/mo | Unlimited |
| Send via Email | ❌ | ✅ | ✅ |
| Reply History Search | Last 20 | Last 100 | Unlimited |
| Brand Settings Sync | Single voice | Multiple | Unlimited |

---

## Build Order (What We Tackle First)

1. **Database: brand_profiles table** — foundation
2. **Setup quiz + website scrape flow** — the core feature
3. **Inject voice into /api/generate** — the magic moment
4. **Settings page UI** — manage profiles
5. **Dropdown in generator** — switch profiles
6. **Email send** — Resend integration
7. **History search** — dashboard upgrade

---

## Open Questions (For Us to Decide Per Phase)

- Should voice DNA be editable after creation? (Yes, probably)
- Should we let users have multiple profiles? (Yes — e.g. different brands)
- What happens if scraping fails? (Fallback to quiz)
- How long should we cache scraped content? (Not needed — one-time)
- Should voice be editable in the reply before sending? (Yes — always let them tweak)
