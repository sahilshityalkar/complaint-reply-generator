import { supabase } from "./supabase";

const BUCKET = "user-options";

interface UserOptions {
  custom_tones: string[];
  custom_biz_types: string[];
  custom_languages: string[];
  last_language?: string;
  auto_reply_enabled?: boolean;
  auto_reply_business_hours?: boolean;
  whatsapp?: {
    provider: string;
    api_key: string;
    phone_number: string;
    connected: boolean;
    connected_at?: string;
  };
}

function getKey(userId: string): string {
  return `${userId}.json`;
}

export async function getUserOptions(userId: string): Promise<UserOptions> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(getKey(userId));

  if (error || !data) {
    // File doesn't exist yet — return defaults
    return { custom_tones: [], custom_biz_types: [], custom_languages: [] };
  }

  try {
    const text = await data.text();
    return JSON.parse(text) as UserOptions;
  } catch {
    return { custom_tones: [], custom_biz_types: [], custom_languages: [] };
  }
}

export async function saveUserOptions(
  userId: string,
  options: UserOptions
): Promise<void> {
  const blob = new Blob([JSON.stringify(options)], { type: "application/json" });
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(getKey(userId), blob, { upsert: true });

  if (error) throw new Error(error.message);
}

export async function addCustomTone(
  userId: string,
  tone: string
): Promise<string[]> {
  const options = await getUserOptions(userId);
  if (!options.custom_tones.includes(tone)) {
    options.custom_tones.push(tone);
    await saveUserOptions(userId, options);
  }
  return options.custom_tones;
}

export async function removeCustomTone(
  userId: string,
  tone: string
): Promise<string[]> {
  const options = await getUserOptions(userId);
  options.custom_tones = options.custom_tones.filter((t) => t !== tone);
  await saveUserOptions(userId, options);
  return options.custom_tones;
}

export async function addCustomBizType(
  userId: string,
  bizType: string
): Promise<string[]> {
  const options = await getUserOptions(userId);
  if (!options.custom_biz_types.includes(bizType)) {
    options.custom_biz_types.push(bizType);
    await saveUserOptions(userId, options);
  }
  return options.custom_biz_types;
}

export async function removeCustomBizType(
  userId: string,
  bizType: string
): Promise<string[]> {
  const options = await getUserOptions(userId);
  options.custom_biz_types = options.custom_biz_types.filter((t) => t !== bizType);
  await saveUserOptions(userId, options);
  return options.custom_biz_types;
}

export async function addCustomLanguage(
  userId: string,
  language: string
): Promise<string[]> {
  const options = await getUserOptions(userId);
  if (!options.custom_languages.includes(language)) {
    options.custom_languages.push(language);
    await saveUserOptions(userId, options);
  }
  return options.custom_languages;
}

export async function removeCustomLanguage(
  userId: string,
  language: string
): Promise<string[]> {
  const options = await getUserOptions(userId);
  options.custom_languages = options.custom_languages.filter((l) => l !== language);
  await saveUserOptions(userId, options);
  return options.custom_languages;
}

export async function saveLanguagePreference(
  userId: string,
  language: string
): Promise<void> {
  const options = await getUserOptions(userId);
  options.last_language = language;
  await saveUserOptions(userId, options);
}

export async function saveAutoReplyPreference(
  userId: string,
  enabled: boolean,
  businessHours: boolean
): Promise<void> {
  const options = await getUserOptions(userId);
  options.auto_reply_enabled = enabled;
  options.auto_reply_business_hours = businessHours;
  await saveUserOptions(userId, options);
}

export async function saveWhatsAppConfig(
  userId: string,
  config: {
    api_key: string;
    phone_number: string;
    connected: boolean;
  }
): Promise<void> {
  const options = await getUserOptions(userId);
  options.whatsapp = {
    provider: "wati",
    api_key: config.api_key,
    phone_number: config.phone_number,
    connected: config.connected,
    connected_at: config.connected ? new Date().toISOString() : undefined,
  };
  await saveUserOptions(userId, options);
}

export async function disconnectWhatsApp(
  userId: string
): Promise<void> {
  const options = await getUserOptions(userId);
  delete options.whatsapp;
  await saveUserOptions(userId, options);
}
