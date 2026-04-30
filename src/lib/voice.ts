import { supabase } from "./supabase";
import { groq, MODEL } from "./groq";

// ============================================================
// TYPES
// ============================================================

export interface LanguagePreference {
  code: string;
  label: string;
  rank: number;
}

export interface ReplyStyle {
  length: "short" | "medium" | "long";
  formality: "casual" | "professional" | "luxury";
  emoji: "never" | "occasional" | "frequent";
}

export interface BrandPreferences {
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

export interface BrandProfile {
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
// CRUD OPERATIONS
// ============================================================

export async function getProfiles(userId: string): Promise<BrandProfile[]> {
  const { data, error } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as BrandProfile[]) || [];
}

export async function getProfile(
  profileId: string,
  userId: string
): Promise<BrandProfile | null> {
  const { data, error } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("id", profileId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as BrandProfile;
}

export async function getDefaultProfile(
  userId: string
): Promise<BrandProfile | null> {
  const { data } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .single();

  return (data as BrandProfile) || null;
}

export async function createProfile(
  userId: string,
  profile: {
    name: string;
    business_name: string;
    industry: string;
    website_url?: string;
    voice_dna?: string;
    sign_off?: string;
    preferences?: Partial<BrandPreferences>;
    setup_method: BrandProfile["setup_method"];
  }
): Promise<BrandProfile> {
  const defaults: BrandPreferences = {
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
  };

  const preferences = profile.preferences
    ? { ...defaults, ...profile.preferences }
    : defaults;

  const { data, error } = await supabase
    .from("brand_profiles")
    .insert({
      user_id: userId,
      name: profile.name,
      business_name: profile.business_name,
      industry: profile.industry,
      website_url: profile.website_url || null,
      voice_dna: profile.voice_dna || null,
      sign_off: profile.sign_off || null,
      preferences,
      setup_method: profile.setup_method,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BrandProfile;
}

export async function updateProfile(
  profileId: string,
  userId: string,
  updates: Partial<{
    name: string;
    business_name: string;
    industry: string;
    website_url: string;
    voice_dna: string;
    sign_off: string;
    preferences: Partial<BrandPreferences>;
    is_default: boolean;
  }>
): Promise<BrandProfile> {
  const { data, error } = await supabase
    .from("brand_profiles")
    .update(updates)
    .eq("id", profileId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as BrandProfile;
}

export async function setDefaultProfile(
  profileId: string,
  userId: string
): Promise<void> {
  await supabase
    .from("brand_profiles")
    .update({ is_default: false })
    .eq("user_id", userId);

  const { error } = await supabase
    .from("brand_profiles")
    .update({ is_default: true })
    .eq("id", profileId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteProfile(
  profileId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("brand_profiles")
    .delete()
    .eq("id", profileId)
    .eq("user_id", userId);

  if (error) throw error;
}

// ============================================================
// VOICE DNA GENERATION (cached, one-time per profile)
// ============================================================

export async function generateVoiceFromUrl(
  website_url: string,
  business_name: string,
  industry: string
): Promise<string> {
  const prompt = `You are analyzing the website of "${business_name}" (${industry}) to determine their brand voice for customer service replies.

Website URL: ${website_url}

Based on this business's industry and typical language, describe their brand voice in 2-3 sentences for use in AI-generated customer service replies.

Focus on:
- Formality level (casual, professional, luxury)
- Emotional tone (warm, direct, empathetic)
- Language patterns (uses "we/our", addresses customer directly, etc.)
- Any industry-specific language expected

Return ONLY the voice description, no extra text. Example: "Warm and personal tone. Uses 'we' and 'you' directly. Casual but professional. Solution-focused. Occasional emoji use."`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 200,
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    "Friendly and professional tone."
  );
}

export async function generateVoiceFromQuiz(params: {
  business_name: string;
  industry: string;
  keywords: string[];
  formality: string;
  emojiStyle: string;
}): Promise<string> {
  const prompt = `Generate a 2-3 sentence brand voice description for "${params.business_name}" (${params.industry}) for use in AI customer service replies.

Keywords: ${params.keywords.join(", ")}
Formality: ${params.formality}
Emoji style: ${params.emojiStyle}

Return ONLY the voice description. Example: "Warm and personal tone. Uses 'we' and 'you' directly. Casual but professional. Solution-focused."`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 200,
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    "Friendly and professional tone."
  );
}

// ============================================================
// PROMPT BUILDER
// ============================================================

export function buildGeneratePrompt(params: {
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
