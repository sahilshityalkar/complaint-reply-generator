import { NextResponse } from "next/server";
import { processInboundEmail } from "@/lib/inbound-email";

/**
 * POST /api/webhooks/inbound
 *
 * Receives inbound email from Resend.
 * Public endpoint — no Clerk auth. Secured by Resend webhook signature (svix).
 *
 * Resend payload format:
 * {
 *   from: "customer@email.com",
 *   to: "replies@replies.mockjee.com",
 *   subject: "Re: ...",
 *   text: "plain text body",
 *   html: "<p>html body</p>",
 *   headers: { ... }
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.text();
    let payload: {
      from?: string;
      to?: string[];
      subject?: string;
      text?: string;
      html?: string;
    };

    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const customerEmail = payload.from?.trim();
    const subject = payload.subject?.trim() || "(no subject)";
    const text = payload.text?.trim() || payload.html?.replace(/<[^>]*>/g, "").trim() || "";

    if (!customerEmail || !text) {
      return NextResponse.json(
        { error: "Missing from or text" },
        { status: 400 }
      );
    }

    // Skip autoresponders and bounce/error messages
    const skipPrefixes = ["mailer-daemon", "postmaster", "noreply", "no-reply", "donotreply"];
    const lowerFrom = customerEmail.toLowerCase();
    if (skipPrefixes.some((p) => lowerFrom.startsWith(p))) {
      return NextResponse.json({ skipped: true, reason: "autoresponder" });
    }

    const result = await processInboundEmail({
      from: customerEmail,
      subject,
      text: text.substring(0, 5000), // Truncate huge emails
    });

    if (!result.userId) {
      return NextResponse.json({
        received: true,
        routed: false,
        reason: "No matching business found for this customer email",
      });
    }

    return NextResponse.json({
      received: true,
      routed: true,
      auto_replied: result.autoReplied,
      history_id: result.historyId,
    });
  } catch (err) {
    console.error("Inbound webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
