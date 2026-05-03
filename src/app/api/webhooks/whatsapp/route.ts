import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserOptions } from "@/lib/user-options";
import { getDefaultProfile } from "@/lib/voice";
import { buildGeneratePrompt } from "@/lib/voice";
import { groq, MODEL } from "@/lib/groq";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { incrementUsage } from "@/lib/usage";

const BUCKET = "user-options";

async function getWhatsAppConversations(userId: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(`${userId}_whatsapp_conversations.json`);

  if (error || !data) return {};
  try {
    return JSON.parse(await data.text());
  } catch {
    return {};
  }
}

async function saveWhatsAppConversations(userId: string, convos: any) {
  const blob = new Blob([JSON.stringify(convos)], { type: "application/json" });
  await supabase.storage
    .from(BUCKET)
    .upload(`${userId}_whatsapp_conversations.json`, blob, {
      upsert: true,
    });
}

async function findUserByWhatsAppNumber(
  businessNumber: string
): Promise<{ userId: string; config: any } | null> {
  // We need to search all user options to find matching WhatsApp number.
  // Since we can't scan all users easily, we use reply_history to find users
  // who have previously sent/received WhatsApp messages with this number.

  // First: check reply_history for recent WhatsApp messages to this number
  const { data: history } = await supabase
    .from("reply_history")
    .select("user_id, customer_email")
    .or(`customer_email.eq.whatsapp:${businessNumber}`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (history && history.length > 0 && history[0].user_id) {
    const options = await getUserOptions(history[0].user_id);
    if (options.whatsapp?.connected) {
      return { userId: history[0].user_id, config: options.whatsapp };
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // WATI webhook format:
    // { eventType: "message", from: "919811234567", to: "919876543210", text: {...}, ... }
    const eventType = payload?.eventType;
    if (eventType !== "message") {
      return NextResponse.json({ received: true, type: eventType });
    }

    const customerPhone = payload?.from || payload?.waId;
    const businessPhone = payload?.to;
    const text =
      typeof payload?.text === "string"
        ? payload.text
        : payload?.text?.body || payload?.text?.message || "";

    if (!customerPhone || !businessPhone || !text) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the business owner by their WhatsApp number
    const business = await findUserByWhatsAppNumber(businessPhone);
    if (!business) {
      return NextResponse.json({
        received: true,
        routed: false,
        reason: "No business found for this number",
      });
    }

    const { userId, config } = business;
    const options = await getUserOptions(userId);

    // Rate limit check per conversation: max 3 auto-replies
    const convos = await getWhatsAppConversations(userId);
    const conversation = convos[customerPhone];
    const autoReplyCount = conversation?.auto_reply_count || 0;

    // Create reply_history entry
    const entry = {
      user_id: userId,
      complaint: text,
      tone: conversation?.original_tone || "Empathetic",
      business_type: conversation?.original_biz_type || "Etsy shop",
      replies: [] as any[],
      customer_email: `whatsapp:${customerPhone}`, // Store phone in email field for lookup
      email_subject: `WhatsApp: ${text.substring(0, 50)}`,
      sent_via_email: false,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("reply_history")
      .insert(entry)
      .select()
      .single();

    if (insertErr || !inserted) {
      return NextResponse.json(
        { received: true, error: "Failed to save" },
        { status: 500 }
      );
    }

    // Check if auto-reply should trigger
    const autoReplyEnabled = options.auto_reply_enabled || false;

    if (
      !autoReplyEnabled ||
      autoReplyCount >= 3 ||
      (options.auto_reply_business_hours &&
        (new Date().getHours() < 9 || new Date().getHours() >= 18))
    ) {
      return NextResponse.json({
        received: true,
        auto_replied: false,
        reason: autoReplyEnabled
          ? autoReplyCount >= 3
            ? "rate_limited"
            : "outside_business_hours"
          : "auto_reply_disabled",
      });
    }

    // Auto-reply enabled → generate + send
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
        max_tokens:
          language && language !== "auto" && language !== "english"
            ? 1536
            : 2048,
      });

      const raw = completion.choices[0].message.content ?? "";
      const { replies } = JSON.parse(raw);

      // Save all 3 replies
      await supabase
        .from("reply_history")
        .update({ replies })
        .eq("id", inserted.id);

      // Auto-send the first reply
      const replyToSend = replies[0].text;
      const result = await sendWhatsAppMessage({
        apiKey: config.api_key,
        businessNumber: businessPhone,
        customerNumber: customerPhone,
        message: replyToSend,
      });

      if (result.success) {
        conversation.auto_reply_count = (conversation.auto_reply_count || 0) + 1;
        conversation.last_reply_text = replyToSend;
        conversation.last_contact = new Date().toISOString();
        convos[customerPhone] = conversation;
        await saveWhatsAppConversations(userId, convos);

        await incrementUsage(userId);
        return NextResponse.json({
          received: true,
          auto_replied: true,
          message_id: result.messageId,
        });
      }
    } catch {
      // Auto-reply failed — manual mode fallback
    }

    return NextResponse.json({
      received: true,
      auto_replied: false,
      reason: "generation_failed",
    });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
