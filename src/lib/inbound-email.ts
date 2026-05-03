import { supabase } from "./supabase";
import { groq, MODEL } from "./groq";
import { buildGeneratePrompt } from "./voice";
import { sendReply } from "./email";
import { getUser, checkLimit, incrementUsage } from "./usage";
import { getUserOptions } from "./user-options";
import { getDefaultProfile } from "./voice";

const BUCKET = "user-options";

interface ConversationEntry {
  customer_email: string;
  first_contact: string;
  last_contact: string;
  reply_count: number;
  original_complaint: string;
  original_tone: string;
  original_biz_type: string;
  last_reply_text: string;
  auto_reply_count: number;
}

interface ConversationFile {
  [customer_email: string]: ConversationEntry;
}

function getConversationKey(userId: string): string {
  return `${userId}_conversations.json`;
}

async function getConversations(
  userId: string
): Promise<ConversationFile> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(getConversationKey(userId));

  if (error || !data) return {};

  try {
    const text = await data.text();
    return JSON.parse(text) as ConversationFile;
  } catch {
    return {};
  }
}

async function saveConversations(
  userId: string,
  convos: ConversationFile
): Promise<void> {
  const blob = new Blob([JSON.stringify(convos)], {
    type: "application/json",
  });
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(getConversationKey(userId), blob, { upsert: true });
  if (error) throw new Error(error.message);
}

export async function recordOutgoingEmail(
  userId: string,
  customerEmail: string,
  complaint: string,
  tone: string,
  bizType: string,
  replyText: string
): Promise<void> {
  const convos = await getConversations(userId);
  const existing = convos[customerEmail];

  convos[customerEmail] = {
    customer_email: customerEmail,
    first_contact: existing?.first_contact || new Date().toISOString(),
    last_contact: new Date().toISOString(),
    reply_count: (existing?.reply_count || 0) + 1,
    original_complaint: existing?.original_complaint || complaint,
    original_tone: existing?.original_tone || tone,
    original_biz_type: existing?.original_biz_type || bizType,
    last_reply_text: replyText,
    auto_reply_count: existing?.auto_reply_count || 0,
  };

  await saveConversations(userId, convos);
}

export async function findUserByCustomerEmail(
  customerEmail: string
): Promise<string | null> {
  // Search reply_history for most recent user who sent to this email
  const { data, error } = await supabase
    .from("reply_history")
    .select("user_id")
    .eq("customer_email", customerEmail)
    .eq("sent_via_email", true)
    .order("sent_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0].user_id;
}

export async function processInboundEmail(params: {
  from: string;
  subject: string;
  text: string;
}): Promise<{ userId: string | null; autoReplied: boolean; historyId?: string }> {
  const { from: customerEmail, subject, text } = params;

  // Find the business owner who sent to this customer
  const userId = await findUserByCustomerEmail(customerEmail);
  if (!userId) {
    // No matching user — can't route this email
    return { userId: null, autoReplied: false };
  }

  // Check user options for auto-reply preference
  const options = await getUserOptions(userId);
  const autoReplyEnabled = options.auto_reply_enabled || false;

  // Get conversation context
  const convos = await getConversations(userId);
  const conversation = convos[customerEmail];

  // Create reply_history entry for this inbound email
  const historyEntry = {
    user_id: userId,
    complaint: text,
    tone: conversation?.original_tone || "Empathetic",
    business_type: conversation?.original_biz_type || "Etsy shop",
    replies: [] as any[],
    customer_email: customerEmail,
    email_subject: subject,
    sent_via_email: false,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("reply_history")
    .insert(historyEntry)
    .select()
    .single();

  if (insertErr || !inserted) {
    return { userId, autoReplied: false };
  }

  // Check rate limit: max 3 auto-replies per conversation
  const autoReplyCount = conversation?.auto_reply_count || 0;
  if (!autoReplyEnabled || autoReplyCount >= 3) {
    return { userId, autoReplied: false, historyId: inserted.id };
  }

  // Check business hours if enabled
  if (options.auto_reply_business_hours) {
    const hour = new Date().getHours();
    if (hour < 9 || hour >= 18) {
      return { userId, autoReplied: false, historyId: inserted.id };
    }
  }

  // Auto-reply: generate 3 replies and send the first one
  try {
    const profile = await getDefaultProfile(userId);
    const language = options.last_language || "auto";
    const tone = conversation?.original_tone || "Empathetic";
    const bizType = conversation?.original_biz_type || "Etsy shop";

    const prompt = buildGeneratePrompt({
      complaint: text,
      tone,
      bizType,
      replyLength: "medium",
      language,
      profile: profile || undefined,
    });

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: language && language !== "auto" && language !== "english" ? 1536 : 2048,
    });

    const raw = completion.choices[0].message.content ?? "";
    const { replies } = JSON.parse(raw);

    // Save all 3 replies to the history entry
    await supabase.from("reply_history").update({ replies }).eq("id", inserted.id);

    // Auto-send the first reply
    const replyToSend = replies[0].text;
    const businessName = profile?.business_name || "Your business";
    const result = await sendReply({
      customer_email: customerEmail,
      subject: `Re: ${subject.replace(/^Re:\s*/i, "")}`,
      reply_text: replyToSend,
      business_name: businessName,
      sign_off: profile?.sign_off ?? undefined,
    });

    if (result.success) {
      // Update conversation: increment auto-reply count
      if (conversation) {
        conversation.auto_reply_count = (conversation.auto_reply_count || 0) + 1;
        conversation.last_reply_text = replyToSend;
        conversation.last_contact = new Date().toISOString();
        conversation.reply_count = (conversation.reply_count || 0) + 1;
        convos[customerEmail] = conversation;
        await saveConversations(userId, convos);
      }

      await incrementUsage(userId);
      return { userId, autoReplied: true, historyId: inserted.id };
    }

    return { userId, autoReplied: false, historyId: inserted.id };
  } catch {
    // Auto-reply failed — the complaint is already saved, user can manually reply
    return { userId, autoReplied: false, historyId: inserted.id };
  }
}

export async function getConversationContext(
  userId: string,
  customerEmail: string
): Promise<ConversationEntry | null> {
  const convos = await getConversations(userId);
  return convos[customerEmail] || null;
}
