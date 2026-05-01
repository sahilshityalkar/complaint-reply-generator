import { supabase } from "./supabase";

const BUCKET = "user-options";

interface UserOptions {
  custom_tones: string[];
  custom_biz_types: string[];
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
    return { custom_tones: [], custom_biz_types: [] };
  }

  try {
    const text = await data.text();
    return JSON.parse(text) as UserOptions;
  } catch {
    return { custom_tones: [], custom_biz_types: [] };
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
