/**
 * Unit tests for buildGeneratePrompt
 *
 * The function is extracted here directly to avoid pulling in
 * supabase/groq client imports that require env variables.
 *
 * Types and function copied from src/lib/voice.ts (pure function, no side effects).
 */

// ============================================================
// TYPES (copied from voice.ts)
// ============================================================

interface LanguagePreference {
  code: string;
  label: string;
  rank: number;
}

interface ReplyStyle {
  length: "short" | "medium" | "long";
  formality: "casual" | "professional" | "luxury";
  emoji: "never" | "occasional" | "frequent";
}

interface BrandPreferences {
  languages: {
    mode: "auto_detect" | "match_customer" | "specific";
    default: string;
    supported: LanguagePreference[];
  };
  reply_style: ReplyStyle;
  rules: string[];
  signature: {
    include_name: boolean;
    include_business: boolean;
    custom: string;
  };
}

interface BrandProfile {
  id: string;
  user_id: string;
  name: string;
  business_name: string;
  industry: string;
  website_url: string | null;
  voice_dna: string | null;
  sign_off: string | null;
  preferences: BrandPreferences;
  setup_method: "scrape" | "quiz" | "template" | "manual";
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// buildGeneratePrompt (extracted from voice.ts)
// ============================================================

function buildGeneratePrompt(params: {
  complaint: string;
  tone: string;
  bizType: string;
  profile?: BrandProfile;
}): string {
  const { complaint, tone, bizType, profile } = params;

  let voiceBlock = `You are a professional customer service expert helping a ${bizType} owner respond to a difficult customer complaint with empathy and professionalism.`;

  if (profile?.voice_dna) {
    voiceBlock = `You are ${profile.business_name}, a ${bizType} business. Your brand voice is:

${profile.voice_dna}
${
  profile.sign_off
    ? `Always sign off with: "${profile.sign_off}"`
    : ""
}

Write as if you ARE ${profile.business_name}. Match the brand's voice exactly.`;
  }

  let styleRules = "";
  if (profile?.preferences?.reply_style) {
    const s = profile.preferences.reply_style;
    if (s.length === "short")
      styleRules += "- Keep replies under 3 sentences.\n";
    if (s.length === "long")
      styleRules += "- Write detailed, thorough replies.\n";
    if (s.formality === "casual")
      styleRules += "- Keep it casual and friendly.\n";
    if (s.formality === "luxury")
      styleRules += "- Maintain a premium, elegant tone.\n";
    if (s.emoji === "never") styleRules += "- Do NOT use emojis.\n";
    if (s.emoji === "frequent")
      styleRules += "- Use emojis naturally.\n";
  }

  let customRules = "";
  if (profile?.preferences?.rules?.length) {
    customRules =
      profile.preferences.rules.map((r: string) => `- ${r}`).join("\n") + "\n";
  }

  const jsonFormat = `{
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
}`;

  return `${voiceBlock}

The customer wrote:
"""
${complaint}
"""

Generate exactly 3 different professional reply variations. The user's preferred primary tone is: ${tone}.

Return ONLY valid JSON in this exact format, no extra text, no markdown:
${jsonFormat}

Rules for every reply:
- 3 to 5 sentences maximum
- Professional but human — not robotic
- Address the specific issue mentioned (do not give generic replies)
- Do not include placeholder text like [Your Name] or [Order Number]
- The first reply must match the requested tone (${tone}) most closely
- Each reply should be meaningfully different from the others
${styleRules}${customRules}- For ${bizType}: use industry-appropriate language and empathy`;
}

// ============================================================
// TEST FRAMEWORK
// ============================================================

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}`);
    failed++;
    errors.push(label);
  }
}

function assertContains(actual: string, expectedSubstring: string, label: string) {
  if (actual.includes(expectedSubstring)) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}`);
    failed++;
    errors.push(`${label} — expected to contain "${expectedSubstring}"`);
  }
}

function assertNotContains(actual: string, unexpectedSubstring: string, label: string) {
  if (!actual.includes(unexpectedSubstring)) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}`);
    failed++;
    errors.push(`${label} — expected NOT to contain "${unexpectedSubstring}"`);
  }
}

// ============================================================
// SHARED TEST DATA
// ============================================================

const complaint =
  "My order arrived damaged and I'm very upset. The box was crushed and the product inside is broken.";
const tone = "empathetic";
const bizType = "e-commerce";

const baseProfile: BrandProfile = {
  id: "test-1",
  user_id: "user-1",
  name: "My Shop",
  business_name: "Handmade Treasures",
  industry: "e-commerce",
  website_url: null,
  voice_dna:
    "Warm and personal tone. Uses 'we' and 'you' directly. Casual but professional. Solution-focused.",
  sign_off: "- Sarah from Handmade Treasures",
  preferences: {
    languages: {
      mode: "auto_detect",
      default: "en",
      supported: [{ code: "en", label: "English", rank: 1 }],
    },
    reply_style: {
      length: "medium",
      formality: "casual",
      emoji: "occasional",
    },
    rules: [],
    signature: {
      include_name: true,
      include_business: true,
      custom: "",
    },
  },
  setup_method: "quiz",
  is_default: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// ============================================================
// TEST 1: WITHOUT a brand profile (no profile)
// ============================================================
console.log("\n── Test 1: No Brand Profile ──");

(() => {
  const result = buildGeneratePrompt({ complaint, tone, bizType });

  assertContains(result, complaint, "1a: Complaint text is present");
  assertContains(result, bizType, "1b: bizType is present in prompt");
  assertContains(result, "professional customer service expert", "1c: Uses generic voice (no brand)");

  assertNotContains(result, "Handmade Treasures", "1d: Does NOT include brand name");
  assertNotContains(result, "- Sarah from Handmade", "1e: Does NOT include sign-off");
  assertNotContains(result, "sign off with", "1f: No sign-off instruction present");
})();

// ============================================================
// TEST 2: WITH a brand profile
// ============================================================
console.log("\n── Test 2: With Brand Profile ──");

(() => {
  const result = buildGeneratePrompt({
    complaint,
    tone,
    bizType,
    profile: baseProfile,
  });

  assertContains(result, complaint, "2a: Complaint text is present");
  assertContains(result, "Handmade Treasures", "2b: Includes business_name");
  assertContains(result, "Sarah from Handmade Treasures", "2c: Includes sign-off text");
  assertContains(result, baseProfile.voice_dna!, "2d: Includes voice_dna verbatim");
  assertContains(result, "Write as if you ARE Handmade Treasures", "2e: Includes identity instruction");
  assertContains(result, "Always sign off with:", "2f: Includes sign-off instruction");
})();

// ============================================================
// TEST 3: WITH style rules (emoji=never, length=short, formality=luxury)
// ============================================================
console.log("\n── Test 3: Style Rules ──");

(() => {
  const profile: BrandProfile = {
    ...baseProfile,
    preferences: {
      ...baseProfile.preferences,
      reply_style: {
        length: "short",
        formality: "luxury",
        emoji: "never",
      },
    },
  };

  const result = buildGeneratePrompt({ complaint, tone, bizType, profile });

  assertContains(result, "Do NOT use emojis", "3a: emoji=never produces 'Do NOT use emojis'");
  assertContains(result, "Keep replies under 3 sentences", "3b: length=short produces 'under 3 sentences'");
  assertContains(result, "premium, elegant tone", "3c: formality=luxury produces 'premium, elegant tone'");
})();

// ============================================================
// TEST 4: WITH custom rules
// ============================================================
console.log("\n── Test 4: Custom Rules ──");

(() => {
  const profile: BrandProfile = {
    ...baseProfile,
    preferences: {
      ...baseProfile.preferences,
      rules: ["Never blame the customer", "Always offer a refund"],
    },
  };

  const result = buildGeneratePrompt({ complaint, tone, bizType, profile });

  assertContains(result, "- Never blame the customer", "4a: First custom rule rendered as bullet");
  assertContains(result, "- Always offer a refund", "4b: Second custom rule rendered as bullet");
  assert(result.includes("Never blame") && result.includes("Always offer"), "4c: Both rules present in output");
})();

// ============================================================
// TEST 5: Complaint text integrity
// ============================================================
console.log("\n── Test 5: Complaint Text Integrity ──");

(() => {
  const result = buildGeneratePrompt({ complaint, tone, bizType });

  assertContains(result, '"""', "5a: Complaint wrapped in triple quotes");
  assertContains(result, complaint, "5b: Full complaint text present verbatim");
  assert(result.includes("My order arrived damaged"), "5c: Beginning of complaint present");
  assert(result.includes("product inside is broken"), "5d: End of complaint present");
})();

// ============================================================
// TEST 6: JSON format instruction is present
// ============================================================
console.log("\n── Test 6: JSON Output Format ──");

(() => {
  const result = buildGeneratePrompt({ complaint, tone, bizType });

  assertContains(result, "Return ONLY valid JSON", "6a: Instruction to return only JSON");
  assertContains(result, '"replies"', "6b: JSON format includes 'replies' array");
  assertContains(result, "Empathetic & Understanding", "6c: JSON includes empathetic reply label");
  assertContains(result, "Firm & Solution-Focused", "6d: JSON includes firm reply label");
  assertContains(result, "Apologetic & Generous", "6e: JSON includes apologetic reply label");
})();

// ============================================================
// TEST 7: Profile without voice_dna — falls back to generic
// ============================================================
console.log("\n── Test 7: Profile Without Voice DNA ──");

(() => {
  const profile: BrandProfile = {
    ...baseProfile,
    voice_dna: null,
    sign_off: null,
    business_name: "Test Business",
  };

  const result = buildGeneratePrompt({ complaint, tone, bizType, profile });

  // Without voice_dna, the voiceBlock should use the generic template
  assertContains(result, "professional customer service expert", "7a: Falls back to generic voice block");
  assertNotContains(result, "Test Business", "7b: Does NOT inject brand name into voice");
  assertNotContains(result, "sign off with", "7c: No sign-off instruction since sign_off is null");
  assertContains(result, complaint, "7d: Complaint still present");
})();

// ============================================================
// TEST 8: Style rules with length=long and emoji=frequent
// ============================================================
console.log("\n── Test 8: Style Rules (length=long, emoji=frequent, formality=professional) ──");

(() => {
  const profile: BrandProfile = {
    ...baseProfile,
    preferences: {
      ...baseProfile.preferences,
      reply_style: {
        length: "long",
        formality: "professional",
        emoji: "frequent",
      },
    },
  };

  const result = buildGeneratePrompt({ complaint, tone, bizType, profile });

  assertContains(result, "Write detailed, thorough replies", "8a: length=long produces detailed replies rule");
  assertContains(result, "Use emojis naturally", "8b: emoji=frequent produces 'Use emojis naturally'");
  assertNotContains(result, "Do NOT use emojis", "8c: Does NOT include 'Do NOT use emojis'");
  assertNotContains(result, "Keep replies under 3 sentences", "8d: Does NOT include short-reply rule");
  assertNotContains(result, "premium, elegant tone", "8e: Does NOT include luxury tone");
  assertNotContains(result, "casual and friendly", "8f: Does NOT include casual tone");
})();

// ============================================================
// SUMMARY
// ============================================================
console.log("\n═════════════════════════════════════════════");
console.log(`  Total: ${passed + failed}  |  PASS: ${passed}  |  FAIL: ${failed}`);
console.log("═════════════════════════════════════════════");

if (errors.length > 0) {
  console.log("\nFailed tests:");
  errors.forEach((e) => console.log(`  ✗ ${e}`));
  console.log();
  process.exit(1);
} else {
  console.log("\n✓ All tests passed!\n");
  process.exit(0);
}
