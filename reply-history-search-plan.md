# Plan: Reply History Search & Filter

## Product Requirement

Users generate replies over time. As their history grows, they need to find past conversations — "what did that angry customer write about the delayed shipment?" or "show me all the refund-related complaints I handled last month."

## Current State

- Dashboard is a **server component** (RSC)
- Fetches last 20 reply_history items via Supabase
- Shows complaint text (truncated to 120 chars), tone, business type, generated replies
- No search, no filter, no pagination
- Supabase query: `select * where user_id=? order by created_at desc limit 20`

## Design Decision

**Approach: URL search params + server-side filtering** (recommended)

| Approach | Pros | Cons |
|----------|------|------|
| **Client-side filter** (fetch all, filter in browser) | Instant UI, no round-trips | Doesn't scale; fetching all rows for power users |
| **URL search params + server-side** ✓ | Scalable, clean URLs, shareable/bookmarkable | Page reloads on search |
| **Debounced client + server API** | Best UX, no page reload | More complex (needs a search API endpoint) |

**Decision**: URL search params for v1. Simple, scalable, zero extra infrastructure. Users expect search to update the URL in a SaaS app.

## Architecture

```
/dashboard?q=refund&tone=Empathetic&page=2
       │
       ▼
  Next.js Server Component
       │
       ├── reads searchParams
       │    ├── q → ILIKE filter on complaint
       │    ├── tone → equality filter on tone
       │    ├── biz → equality filter on business_type
       │    └── page → offset calculation
       │
       ├── builds Supabase query
       │    .from("reply_history")
       │    .eq("user_id", userId)
       │    .ilike("complaint", `%${q}%`)   // if q present
       │    .eq("tone", tone)               // if tone present
       │    .eq("business_type", biz)       // if biz present
       │    .order("created_at", false)
       │    .range((page-1)*20, page*20-1)
       │
       └── renders results + search bar + pagination
```

## UI Design

### Desktop
```
┌────────────────────────────────────────────────┐
│  Dashboard                          [Generate] │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  This month                                │  │
│  │  12 / 100 replies          [free]          │  │
│  │  ═══════════════░░░░░░░░░░░░               │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Reply history                                   │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  🔍 Search past complaints...              │  │
│  │  [Tone: All ▼] [Business: All ▼]          │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Etsy shop · Empathetic tone               │  │
│  │  "I ordered 3 weeks ago and still haven't…"│  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │ Reply 1: We understand your frustration │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  │  15 May, 10:30 AM                     ✉️    │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  < Prev                Page 2 of 5      Next >   │
└────────────────────────────────────────────────┘
```

### Search States

| State | What User Sees |
|-------|---------------|
| **No search** | Last 20 items (unchanged from current) |
| **Searching** | Loading indicator at top of results |
| **Results found** | Filtered list with count: "12 results for "refund"" |
| **No results** | "No results for "refund". Try different keywords." |
| **Empty history** | Current: "No history yet. Generate your first reply" |

## Build Plan

### Task 1 — Add `SearchBar` client component
- Text input + dropdown filters + search button
- Navigates via `useRouter` + `searchParams`
- Reads current params on mount
- Props: available tones/biz types from user's history

### Task 2 — Add `Pagination` component
- Previous / Next buttons
- Page number display
- Derived from count + offset

### Task 3 — Update dashboard server component
- Read `searchParams` from page props
- Add ILIKE filter for complaint search
- Add equality filters for tone/biz type
- Add offset-based pagination to Supabase query
- Count total matching rows for pagination

### Task 4 — Style & polish
- Search bar: light gray background, rounded, clear button
- Loading state during search
- Empty state messaging
- Results count: "Showing 12 results for "refund""

### Task 5 — Build & push

## Implementation Details

### Server Component Changes (dashboard/page.tsx)
```tsx
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tone?: string; biz?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const tone = params.tone || "";
  const biz = params.biz || "";
  const page = Math.max(1, parseInt(params.page || "1"));
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("reply_history")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  if (q) query = query.ilike("complaint", `%${q}%`);
  if (tone) query = query.eq("tone", tone);
  if (biz) query = query.eq("business_type", biz);

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Get unique tones/biz types from user's history for filter dropdowns
  const { data: filters } = await supabase
    .from("reply_history")
    .select("tone, business_type")
    .eq("user_id", userId);

  const uniqueTones = [...new Set(filters?.map(f => f.tone) || [])];
  const uniqueBizTypes = [...new Set(filters?.map(f => f.business_type) || [])];
}
```

### Client Component (SearchBar)
```tsx
"use client";

export function SearchBar({
  currentQ, currentTone, currentBiz,
  availableTones, availableBizTypes,
}: { ... }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(currentQ);

  function handleSearch() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tone) params.set("tone", tone);
    if (biz) params.set("biz", biz);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <input value={q} onChange={e => setQ(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleSearch()}
        placeholder="🔍 Search past complaints..." />
      <select value={tone} onChange={...}>
        <option value="">All tones</option>
        {availableTones.map(t => <option key={t}>{t}</option>)}
      </select>
      {/* same for biz types */}
      <button onClick={handleSearch}>Search</button>
    </div>
  );
}
```

## Scalability Notes

- **ILIKE** is fine for 10K rows. For 100K+, add a `complaint_tsv tsvector` index and use `plainto_tsquery` for full-text search.
- **`count: "exact"`** has overhead on large tables. For 100K+, use a separate count estimate or switch to infinite scroll.
- **Page size 20** is a sensible default. Can make it configurable later.
- **No debounce** needed since search is URL-based. Clear intent → submit.
