import { supabase } from "./supabase";

const BUCKET = "user-options";

export interface ReplyTemplate {
  id: string;
  name: string;
  reply_text: string;
  tone: string;
  biz_type: string;
  created_at: string;
}

function getKey(userId: string): string {
  return `${userId}_templates.json`;
}

export async function getTemplates(userId: string): Promise<ReplyTemplate[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(getKey(userId));

  if (error || !data) return [];

  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveTemplates(
  userId: string,
  templates: ReplyTemplate[]
): Promise<void> {
  const blob = new Blob([JSON.stringify(templates)], {
    type: "application/json",
  });
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(getKey(userId), blob, { upsert: true });
  if (error) throw new Error(error.message);
}

export async function addTemplate(
  userId: string,
  template: Omit<ReplyTemplate, "id" | "created_at">
): Promise<ReplyTemplate[]> {
  const templates = await getTemplates(userId);
  const newTemplate: ReplyTemplate = {
    ...template,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  templates.unshift(newTemplate); // newest first
  await saveTemplates(userId, templates);
  return templates;
}

export async function deleteTemplate(
  userId: string,
  templateId: string
): Promise<ReplyTemplate[]> {
  const templates = await getTemplates(userId);
  const filtered = templates.filter((t) => t.id !== templateId);
  await saveTemplates(userId, filtered);
  return filtered;
}

export async function renameTemplate(
  userId: string,
  templateId: string,
  newName: string
): Promise<ReplyTemplate[]> {
  const templates = await getTemplates(userId);
  const found = templates.find((t) => t.id === templateId);
  if (found) found.name = newName;
  await saveTemplates(userId, templates);
  return templates;
}
