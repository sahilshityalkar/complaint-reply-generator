import { Resend } from "resend";

const FROM_DOMAIN = "replies@replyai.app";

// Lazy singleton — avoids Resend SDK errors during static build
let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || "");
  }
  return _resend;
}

export interface SendReplyParams {
  customer_email: string;
  subject: string;
  reply_text: string;
  business_name: string;
  sign_off?: string;
}

export interface SendReplyResult {
  success: boolean;
  email_id?: string;
  error?: string;
}

/**
 * Send a reply email to a customer using Resend.
 * 
 * The email comes from "BusinessName via ReplyAI" <replies@replyai.app>
 * so the customer knows it's from a professional tool, not spoofed.
 */
export async function sendReply(params: SendReplyParams): Promise<SendReplyResult> {
  const { customer_email, subject, reply_text, business_name, sign_off } = params;

  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "Email service not configured" };
  }

  // Build the email body
  const body = sign_off ? `${reply_text}\n\n${sign_off}` : reply_text;
  const htmlBody = body
    .replace(/\n/g, "<br>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');

  try {
    const { data, error } = await getResend().emails.send({
      from: `${business_name} via ReplyAI <${FROM_DOMAIN}>`,
      to: [customer_email],
      subject,
      text: body,
      html: `<p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;">${htmlBody}</p>`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, email_id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error sending email";
    return { success: false, error: message };
  }
}

/**
 * Generate an email subject line based on complaint context.
 */
export function generateSubject(complaint: string, business_name: string): string {
  const words = complaint.toLowerCase().split(" ");
  const keyTerms = ["order", "refund", "shipping", "delivery", "quality", "product", "service", "support", "billing", "return"];

  const found = keyTerms.filter((t) => words.includes(t));
  const topic = found.length > 0 ? found[0] : "your recent message";

  return `Re: ${business_name} — regarding ${topic}`;
}

/**
 * Check if email sending is available for a given plan.
 */
export function getEmailSendLimit(plan: string): number {
  switch (plan) {
    case "free":
      return 5;
    case "starter":
      return 50;
    case "pro":
      return -1;
    default:
      return 5;
  }
}

/**
 * Count email sends by a user in the current month.
 */
export async function countEmailSends(userId: string, supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count, error } = await supabase
    .from("reply_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("sent_via_email", true)
    .gte("sent_at", startOfMonth);

  if (error) throw error;
  return count || 0;
}
