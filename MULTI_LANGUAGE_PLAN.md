# Plan: Multi-Language Reply Generation

> **Senior PM / Architect document for junior engineer (flash model)**
> Read this ENTIRELY before touching any code. Every decision is explained.
> If you're unsure about anything, re-read the relevant section.

---

## 1. Product Spec

### What We're Building
Users paste a complaint in **any Indian language** → ReplyAI auto-detects the language → generates 3 replies in the **same language** as the complaint. User can override the language manually.

### Why This Matters
- Indian e-commerce complaints are **80%+ Hinglish or Hindi**
- A business owner getting "bhaiya order kab aayega?" wants to reply in Hinglish, not English
- Auto-detection removes friction — no dropdown hunting
- Hinglish is the #1 use case (Hindi words in English script)

### Language Tier System

| Tier | Languages | Why |
|------|-----------|-----|
| 🥇 **S-Tier (Auto-detect)** | Hinglish, Hindi, English | These cover 90%+ of Indian business complaints. AI handles them perfectly. |
| 🥈 **A-Tier (Manual select)** | Tamil, Marathi, Bengali, Gujarati, Telugu, Kannada, Malayalam | Common regional languages. AI supports them but we don't auto-detect because false-positives between similar scripts. |
| 🥉 **B-Tier (Future)** | Any language user types in | The "Custom" option lets user type any language name. AI will try its best. |

### For This Build (v1)
We ship:
1. **Auto-detect**: Hinglish, Hindi, English (matches complaint language)
2. **Manual dropdown**: Hinglish, Hindi, English, Tamil, Marathi, Bengali
3. **Custom**: Free-text "Other language" input

### Non-Goals (Do NOT build)
- ❌ Translating the UI to multiple languages (app stays English)
- ❌ Storing translations in the database (replies are generated fresh each time)
- ❌ Translation API integration (Google Translate, DeepL, etc.)
- ❌ Language auto-detection using an external library (we use prompt engineering)

---

## 2. How It Works (Architecture)

```
User pastes complaint: "bhaiya order kab aayega? 2 hafte ho gaye"
                            │
                            ▼
          ┌─────────────────────────────────┐
          │  Language Detection             │
          │  (done INSIDE the AI prompt)     │
          │                                  │
          │  The prompt says:                │
          │  "Detect the language of the     │
          │   complaint. Reply in the SAME   │
          │   language matching the tone,    │
          │   script, and formality."        │
          └─────────────────────────────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │  Groq / Llama 3.3 70B           │
          │  → Understands complaint        │
          │  → Generates reply in same lang  │
          │  → Returns 3 JSON replies        │
          └─────────────────────────────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │  Reply displayed in ReplyCard   │
          │  (same UI, just different text) │
          └─────────────────────────────────┘
```

**Key insight**: No translation API needed. No language detection library needed. The LLM handles both detection and generation in a single prompt. Llama 3.3 was trained on Indian internet content and natively understands Hinglish, Hindi, Tamil, etc.

---

## 3. Prompt Engineering (This Is Everything)

### Current Prompt (voice.ts, buildGeneratePrompt)
The current prompt ends with:
```
Generate exactly 3 different professional reply variations.
The user's preferred primary tone is: ${tone}.
```

### New Prompt Structure
We add a language instruction block **between** the tone line and the reply rules:

```
Generate exactly 3 different professional reply variations.
The user's preferred primary tone is: ${tone}.

LANGUAGE INSTRUCTIONS (CRITICAL):
- The customer's complaint is written in ${languageInstruction}.
- ${languageRule}
- Use the same script (Devanagari/Latin/etc.) as the complaint.
- Match the formality level of the complaint (formal Hindi ≠ casual Hinglish).

Rules for every reply:
...
```

### Language Instructions Per Language

| Language | Instruction Sent to AI |
|----------|----------------------|
| **Auto** (default) | "Detect the complaint's language automatically. If it's Hinglish (Hindi mixed with English words, written in Latin/Roman script like 'bhaiya order kab aayega'), reply in Hinglish. If it's pure Hindi in Devanagari script (जैसे यह वाक्य), reply in Hindi. If it's English, reply in English. Match the exact script and language of the complaint." |
| **Hinglish** | "Reply in Hinglish — a mix of Hindi and English words written in Latin/Roman script. Use conversational, natural Hinglish. Do NOT use Devanagari script. Do NOT reply in pure English or pure Hindi." |
| **Hindi** | "Reply in pure Hindi using Devanagari script (हिन्दी). Use formal, respectful Hindi. Do NOT use English words unless they are proper nouns. Do NOT use Latin/Roman script." |
| **English** | "Reply in English. Professional business English." |
| **Tamil** | "Reply in Tamil (தமிழ்) using Tamil script. Use respectful, formal Tamil suitable for business communication." |
| **Marathi** | "Reply in Marathi (मराठी) using Devanagari script. Use respectful, professional Marathi." |
| **Custom** | "Reply in ${customLanguage}. Match the tone and formality appropriate for that language."

### Why This Approach Works
- Llama 3.3 understands Hinglish natively (trained on Indian internet data)
- The prompt explicitly tells it the script to use (prevents Devanagari when user wants Latin)
- "Match the exact script" prevents the model from switching scripts mid-reply
- Formality matching is important: Hinglish is casual, Hindi is formal

---

## 4. Data Model (Zero Schema Changes)

We do NOT store language in the database for v1. The `reply_history` table already stores `tone` and `replies` (JSONB). The language is **implicit** in the reply text — if the reply is in Hindi script, the stored text is in Hindi.

If we want analytics later ("how many Hindi replies were generated?"), we can add a `language` column to `reply_history` in a future migration. For now, KISS.

---

## 5. UI/UX Design (Exact Specs)

### Where It Goes
The Language selector goes **BETWEEN** the Tone selector and the Reply Length selector. It's a quick-access horizontal row — not buried in a dropdown.

### Layout

```
┌──────────────────────────────────────────────────┐
│  Paste the customer complaint                     │
│  ┌────────────────────────────────────────────┐   │
│  │  bhaiya order kab aayega?                  │   │
│  │  2 hafte ho gaye aur koi update nahi aaya  │   │
│  └────────────────────────────────────────────┘   │
│                                        150 chars  │
│                                                   │
│  Business type    [Etsy] [Shopify] [Freelance]…   │
│                                                   │
│  Your tone        [Empathetic] [Firm] [Apolog…]   │
│                                                   │
│  ┌─ Language ───────────────────────────────────┐ │
│  │                                               │ │
│  │  [● Auto]  [○ Hinglish]  [○ Hindi]  [○ Eng]  │ │
│  │  [○ Tamil]  [○ Marathi]  [○ Bengali]          │ │
│  │                                               │ │
│  │  + Add custom language                        │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  Reply length     [Short] [Medium] [Long]          │
│                                                   │
│  [    Generate 3 replies    ]                      │
└──────────────────────────────────────────────────┘
```

### "Auto" Mode (Selected by Default)
When "Auto" is selected, a subtle info text appears below the language row:
```
✨ Auto: replies will match the complaint's language
```
This text disappears when a specific language is selected.

### Custom Language Input
Clicking "+ Add custom language" reveals an inline input:
```
┌──────────────────────────────────────────────┐
│  Language name: [Punjabi________] [Add] [✕]  │
└──────────────────────────────────────────────┘
```
Once added, "Punjabi" appears as a pill in the language row. It's stored per-user (same as custom tones/biz types — uses the existing `/api/user/options` endpoint).

### States to Handle

| State | Behavior |
|-------|----------|
| **Auto selected** | No language param sent to API. AI auto-detects from complaint. |
| **Specific language selected** | Language param sent to API. AI forced to that language. |
| **Custom language added** | Pill appears in row. Clickable. Stored in user options. |
| **Custom language deleted** | Pill removed. If it was selected, fall back to "Auto." |
| **No complaint entered** | Language selector still visible, "Auto" selected. No-op. |

### Visual Design
- Same pill/button style as Tone and Business Type selectors
- Selected pill: black bg, white text (matching existing pattern)
- Unselected pill: white bg, gray text, gray border
- "Auto" pill has a subtle indicator (maybe a small sparkle icon or different styling)
- Custom language pills have an ✕ to delete (same as custom tones)

---

## 6. Language Detection Logic (Server-Side)

### Approach: Prompt-Level Detection (No External Library)

We do NOT use a separate detection endpoint. The AI prompt itself handles detection. Here's the exact logic:

```typescript
// In src/app/api/generate/route.ts

const { language } = await req.json();
// language can be: "auto" | "hinglish" | "hindi" | "english" | "tamil" | "marathi" | "bengali" | string

const languageForPrompt = language || "auto"; // default to auto
```

### How "Auto" Works in the Prompt
The prompt tells the AI:
```
LANGUAGE INSTRUCTIONS (CRITICAL):
- Detect the language of the complaint automatically.
- If Hinglish (Hindi+English in Latin script), reply in Hinglish.
- If Hindi in Devanagari script, reply in Hindi.
- If English, reply in English.
- Match the EXACT script and language of the complaint.
```

This works because:
1. Llama 3.3 can detect language from text
2. It can generate in that detected language
3. All in one API call — no extra latency

### When Manual Language Is Selected
The prompt tells the AI:
```
LANGUAGE INSTRUCTIONS (CRITICAL):
- Reply in ${languageDisplayName}.
- ${languageSpecificInstruction}
- Match the tone and formality appropriate for that language.
```

### Language Config Map
```typescript
const LANGUAGE_CONFIG: Record<string, {
  display: string;
  instruction: string;
}> = {
  auto: {
    display: "Auto (match complaint)",
    instruction: "Detect the complaint's language automatically. If it's Hinglish (Hindi mixed with English words, written in Latin/Roman script like 'bhaiya order kab aayega'), reply in Hinglish. If it's pure Hindi in Devanagari script (जैसे यह वाक्य), reply in Hindi. If it's English, reply in English. Match the exact script and language of the complaint."
  },
  hinglish: {
    display: "Hinglish",
    instruction: "Reply in Hinglish — a mix of Hindi and English words written in Latin/Roman script. Use conversational, natural Hinglish. Do NOT use Devanagari script. Do NOT reply in pure English or pure Hindi."
  },
  hindi: {
    display: "Hindi",
    instruction: "Reply in pure Hindi using Devanagari script (हिन्दी). Use formal, respectful Hindi. Do NOT use English words unless they are proper nouns. Do NOT use Latin/Roman script."
  },
  english: {
    display: "English",
    instruction: "Reply in English. Professional business English."
  },
  tamil: {
    display: "Tamil",
    instruction: "Reply in Tamil (தமிழ்) using Tamil script. Use respectful, formal Tamil suitable for business communication."
  },
  marathi: {
    display: "Marathi",
    instruction: "Reply in Marathi (मराठी) using Devanagari script. Use respectful, professional Marathi."
  },
  bengali: {
    display: "Bengali",
    instruction: "Reply in Bengali (বাংলা) using Bengali script. Use respectful, professional Bengali suitable for business communication."
  },
};
```

For custom languages, the instruction is dynamically generated:
```typescript
instruction: `Reply in ${languageName}. Match the tone and formality appropriate for that language.`
```

---

## 7. User Options Integration (Custom Languages)

Custom languages are stored the same way as custom tones and business types — using the existing `/api/user/options` endpoint.

### New Field in User Options
```json
{
  "custom_tones": ["Warm & Humorous"],
  "custom_biz_types": ["Consulting Agency"],
  "custom_languages": ["Punjabi", "Kannada"]
}
```

### API Route Changes
The existing `POST /api/user/options` route already handles `type` and `action` params. We add:
```
POST /api/user/options
Body: { type: "language", action: "add", value: "Punjabi" }
Body: { type: "language", action: "remove", value: "Punjabi" }
```

### Library Changes
In `src/lib/user-options.ts`, add:
```typescript
interface UserOptions {
  custom_tones: string[];
  custom_biz_types: string[];
  custom_languages: string[];  // NEW
}
```

And add `addCustomLanguage` / `removeCustomLanguage` functions (same pattern as tones/biz types).

---

## 8. Build Plan (Exact Files and Order)

### Task 1: Language Config + Prompt Changes
**File**: `src/lib/voice.ts`

Changes:
1. Add `LANGUAGE_CONFIG` map (shown in Section 6)
2. Modify `buildGeneratePrompt` params to accept `language?: string`
3. Add language instruction block to the prompt output

Exact code to add (AFTER the tone line in the prompt):
```typescript
// In buildGeneratePrompt, after "The user's preferred primary tone is: ${tone}."
// and before "Return ONLY valid JSON..."

const lang = LANGUAGE_CONFIG[language || "auto"] || {
  display: language,
  instruction: `Reply in ${language}. Match the tone and formality appropriate for that language.`
};

const languageBlock = `
LANGUAGE INSTRUCTIONS (CRITICAL):
${lang.instruction}
- Use the same script (Devanagari/Latin/Bengali/Tamil/etc.) appropriate for the language.
- Match the formality level of the complaint (formal vs casual).
`;
```

**File**: `src/app/api/generate/route.ts`

Changes:
1. Accept `language` from request body
2. Pass `language` to `buildGeneratePrompt`

### Task 2: User Options Library Update
**File**: `src/lib/user-options.ts`

Changes:
1. Add `custom_languages: string[]` to `UserOptions` interface
2. Add `addCustomLanguage(userId, language)` function
3. Add `removeCustomLanguage(userId, language)` function

### Task 3: API Route Update
**File**: `src/app/api/user/options/route.ts`

Changes:
1. Add handler for `type === "language"` with `action: "add"` / `action: "remove"`

### Task 4: UI — ReplyGenerator Update
**File**: `src/components/ReplyGenerator.tsx`

This is the biggest change. We add:

A) **State variables**:
```typescript
const [language, setLanguage] = useState("auto");
const [customLanguages, setCustomLanguages] = useState<string[]>([]);
const [newLanguageInput, setNewLanguageInput] = useState("");
const [addingLanguage, setAddingLanguage] = useState(false);
```

B) **Fetch custom languages on mount** (in the existing useEffect that fetches user options)

C) **Language selector UI** (between Tone and Reply Length sections):
```tsx
{/* Language selector */}
<div className="flex flex-col gap-2">
  <label className="text-sm font-medium text-gray-700">
    Reply language
    {language === "auto" && (
      <span className="ml-2 text-xs text-gray-400 font-normal">
        ✨ Auto: matches the complaint's language
      </span>
    )}
  </label>
  <div className="flex flex-wrap gap-2">
    {/* Built-in languages */}
    {BUILTIN_LANGUAGES.map((lang) => (
      <button
        key={lang.value}
        onClick={() => setLanguage(lang.value)}
        className={`px-4 py-2 rounded-full text-sm border ...`}
      >
        {lang.label}
      </button>
    ))}
    {/* Custom languages */}
    {customLanguages.map((lang) => (
      <div key={lang} className="flex items-center gap-1">
        <button onClick={() => setLanguage(lang)}>...</button>
        <button onClick={() => handleRemoveLanguage(lang)}>✕</button>
      </div>
    ))}
  </div>
  {/* Add custom language */}
  {/* Same pattern as custom tones/biz types: inline input + Add/Cancel */}
</div>
```

D) **BUILTIN_LANGUAGES constant**:
```typescript
const BUILTIN_LANGUAGES = [
  { value: "auto", label: "Auto" },
  { value: "hinglish", label: "Hinglish" },
  { value: "hindi", label: "Hindi" },
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
  { value: "marathi", label: "Marathi" },
  { value: "bengali", label: "Bengali" },
] as const;
```

E) **Pass language to API** (in handleGenerate):
```typescript
body: JSON.stringify({
  complaint,
  tone,
  bizType,
  replyLength,
  language: language === "auto" ? undefined : language, // undefined = AI auto-detects
  profile_id: selectedProfileId || undefined,
}),
```

F) **Add/Remove custom language functions** (same pattern as tones/biz types)

### Task 5: Build + Verify
Run `npm run build`, fix any type errors, then push.

---

## 9. Testing Checklist (Do NOT skip)

### Test 1: Auto-Detect Hinglish
1. Paste complaint: "bhaiya order kab aayega? 2 hafte ho gaye"
2. Language: "Auto" selected
3. Generate → All 3 replies should be in Hinglish (Hindi+English mix, Latin script)

### Test 2: Auto-Detect Hindi (Devanagari)
1. Paste complaint: "मेरा ऑर्डर 2 हफ्ते पहले आना चाहिए था लेकिन अभी तक नहीं आया"
2. Language: "Auto" selected
3. Generate → All 3 replies should be in Devanagari Hindi

### Test 3: Force English
1. Paste same Hinglish complaint
2. Language: "English" selected
3. Generate → All 3 replies should be in English

### Test 4: Manual Hindi
1. Paste English complaint
2. Language: "Hindi" selected
3. Generate → All 3 replies should be in Devanagari Hindi

### Test 5: Tamil
1. Language: "Tamil" selected
2. Generate → Replies should be in Tamil script

### Test 6: Custom Language
1. Add "Punjabi" as custom language
2. Select "Punjabi"
3. Generate → AI should attempt Punjabi

### Test 7: Custom Language Persistence
1. Add "Punjabi"
2. Refresh page
3. "Punjabi" should still be in the language selector

### Test 8: Custom Language Delete
1. Delete "Punjabi"
2. If "Punjabi" was selected, should fall back to "Auto"

### Test 9: No Language Selected
1. "Auto" selected (default)
2. No language param in API request body
3. Verify generate still works normally

### Test 10: Build
1. `npm run build` — should produce 0 errors
2. 15 routes expected
3. Lint clean (pre-existing errors only)

---

## 10. File Change Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `src/lib/voice.ts` | Modify | ~30 lines added (config map + prompt block) |
| `src/app/api/generate/route.ts` | Modify | ~5 lines (accept + pass language) |
| `src/lib/user-options.ts` | Modify | ~15 lines (interface + 2 functions) |
| `src/app/api/user/options/route.ts` | Modify | ~10 lines (language handler) |
| `src/components/ReplyGenerator.tsx` | Modify | ~80 lines (state, UI, handlers) |

**Total**: ~140 lines added. No new files. No schema changes. No new dependencies.

---

## 11. Edge Cases

| Edge Case | How We Handle |
|-----------|--------------|
| Complaint has mixed languages (English + Hindi words) | "Auto" mode tells AI to detect the primary language and match it |
| Complaint uses Devanagari but user wants Hinglish reply | User selects "Hinglish" manually → AI translates intent to Latin script |
| User types a custom language AI doesn't know | AI will try its best. We don't validate. |
| Empty complaint with language selected | Language selector is cosmetic until complaint is pasted. Generate still validates 20+ chars. |
| Very long language name | CSS truncation (same as custom tones/biz types) |
| Same custom language added twice | Prevent duplicate in `handleAddLanguage` |

---

## 12. Why This Approach Beats Translation APIs

| Factor | Prompt Engineering (Our Approach) | Translation API (DeepL/Google) |
|--------|-----------------------------------|-------------------------------|
| **Cost** | $0 (included in existing Groq call) | $20+/month per 1M chars |
| **Latency** | 0ms extra (same API call) | +200-500ms (separate API call) |
| **Naturalness** | AI generates natively → sounds human | Translated → sounds robotic |
| **Hinglish support** | ✅ Native (LLaMA trained on Indian internet) | ❌ No translation API supports Hinglish |
| **Tone/culture match** | ✅ AI understands Indian business context | ❌ Literal translation, loses nuance |
| **Maintenance** | Zero dependencies | API key, rate limits, billing |

---
