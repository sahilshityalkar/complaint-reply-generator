# Plan: Custom Tones, Business Types & Reply Length

## Product Requirements

**Problem**: Users are locked into 4 tones and 6 business types. Every user has the same options. No way to add their own.

**Goal**: Let users create/manage their own tones and business types (per-account), plus add reply length control at generation time.

---

## Design Decision: Separate Tables vs JSONB vs Brand Profile

| Approach | Pros | Cons |
|----------|------|------|
| **JSONB on `users` table** | Simplest code, no new tables | Can't query/debug easily, harder to add metadata later |
| **Add to `brand_profiles.preferences`** | Reuses existing JSONB | Ties tone/biz to a specific brand profile — wrong semantics |
| **Separate tables (recommended)** ✓ | Queryable, indexable, scalable, clean CRUD, can add ordering/metadata later | Slightly more code |

**Decision**: Separate tables. These are user-level entities (not tied to a brand profile), and a user should keep their custom tones even if they delete a brand profile.

---

## Data Model

### New Tables

```sql
CREATE TABLE user_tones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_biz_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Why `sort_order`**: Users should be able to reorder their custom items.

### Existing Schema (no changes)
- `reply_history` table already has `tone` and `business_type` columns — custom values go there naturally
- `users` table — no changes needed

---

## API Layer

### New Endpoints

```
GET    /api/user/tones        → list user's custom tones
POST   /api/user/tones        → create tone { name }
PATCH  /api/user/tones/:id    → rename or reorder
DELETE /api/user/tones/:id    → delete

GET    /api/user/biz-types        → list user's custom biz types
POST   /api/user/biz-types        → create { name }
PATCH  /api/user/biz-types/:id    → rename or reorder
DELETE /api/user/biz-types/:id    → delete
```

### Modified Endpoints

**`POST /api/generate`** — accept new field:
```ts
{
  complaint: string,
  tone: string,          // "Empathetic" (default) or custom value
  bizType: string,       // "Etsy shop" (default) or custom value
  replyLength: "short" | "medium" | "long",  // NEW
  profile_id?: string
}
```

---

## Frontend UI (ReplyGenerator.tsx)

### Tone Section — New Layout
```
┌──────────────────────────────────────┐
│ Your preferred tone                   │
│                                       │
│  [Empathetic]  [Firm]  [Apologetic]   │ ← defaults (hardcoded)
│  [Professional]                       │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │ ← visual divider
│  [Warm & Humorous ×]  [Direct ×]      │ ← custom from DB (× to delete)
│                                       │
│  [+ Add custom tone]                  │ ← inline text input
└──────────────────────────────────────┘
```

### Business Type Section — Same Pattern
```
┌──────────────────────────────────────┐
│ Business type                         │
│                                       │
│  [Etsy shop]  [Shopify]  [Freelancer] │ ← defaults
│  [Restaurant]  [SaaS]  [Other]        │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│  [Consulting ×]  [Fitness Coach ×]    │ ← custom from DB
│                                       │
│  [+ Add custom business type]         │
└──────────────────────────────────────┘
```

### Reply Length — New Section
```
┌──────────────────────────────────────┐
│ Reply length                          │
│                                       │
│  [● Short]  [○ Medium]  [○ Long]      │ ← radio/toggle
│                                       │
│  Short: 2-3 sentences, concise        │
│  Medium: 3-5 sentences, balanced      │ ← show description on hover
│  Long: 6-10 sentences, detailed       │
└──────────────────────────────────────┘
```

### State Flow
1. On mount: fetch custom tones + biz types from API
2. Merge defaults + custom into same UI with visual divider
3. Selected state: can be a default or a custom value
4. "Add custom" → inline input → POST to API → refresh list
5. Delete (×) → confirm → DELETE from API → refresh list
6. Reply length defaults to "medium" (matching current behavior)

---

## Prompt Changes (buildGeneratePrompt)

### New Parameter
```ts
replyLength?: "short" | "medium" | "long"
```

### Prompt Logic
```ts
const lengthRules = {
  short:  "- Keep each reply short: 2-3 sentences max. Be concise.",
  medium: "- Keep each reply moderate: 3-5 sentences. Professional and clear.",
  long:   "- Write detailed replies: 6-10 sentences. Thorough but not verbose.",
};
// default to medium if not specified
```

### Tone Injection
The `tone` parameter already flows into the prompt (line 347, 357 of voice.ts):
```
"The user's preferred primary tone is: ${tone}."
```
No changes needed — custom tone text goes here directly.

---

## Build Plan

### Task 1 — Database Migration
- Create `user_tones` and `user_biz_types` tables in Supabase
- Add `sort_order` column

### Task 2 — API: tones
- `src/lib/user-options.ts` — Supabase CRUD helpers for both tables
- `src/app/api/user/tones/route.ts` — GET + POST
- `src/app/api/user/tones/[id]/route.ts` — PATCH + DELETE

### Task 3 — API: biz-types
- `src/app/api/user/biz-types/route.ts` — GET + POST
- `src/app/api/user/biz-types/[id]/route.ts` — PATCH + DELETE

### Task 4 — API: generate route
- Accept `replyLength` in POST /api/generate
- Pass to `buildGeneratePrompt`

### Task 5 — Prompt: buildGeneratePrompt
- Accept `replyLength` parameter
- Add length-specific instructions
- Already handles custom tone/bizType (they're just strings)

### Task 6 — UI: ReplyGenerator
- Fetch custom tones & biz types on mount
- Build the merged UI (defaults + custom + add/delete)
- Add reply length selector
- Pass `replyLength` to generate API

### Task 7 — Build & Push
- `npm run build` — verify clean
- `git push` — deploy

---

## Scalability Notes

1. **100 users**: Separate tables + indexes = instant queries
2. **10,000 users**: Add pagination to list endpoints, but each user has <50 items
3. **100,000 users**: Add Redis cache for hot data, but unlikely for a micro-SaaS
4. **Monetization**: Could gate "unlimited custom items" behind paid plans (free=5, starter=25, pro=unlimited) — trivial with existing plan system
5. **Extensibility**: Adding categories, icons, or AI-suggested tones later is easy with separate tables

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| User creates 100 identical tones | No validation needed — it's their data. Could add dedupe hint later |
| Empty state (no custom items) | UI just shows defaults + "Add" button — same as today |
| Long custom tone names break UI | CSS truncate + tooltip |
| Deleting a tone that's currently selected | Fall back to first default tone |
