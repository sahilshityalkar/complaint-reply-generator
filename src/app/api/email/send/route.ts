import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sendReply } from "@/lib/email";
import { getUser } from "@/lib/usage";
import { isEmailUnderLimit } from "@/lib/plans";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reply_text, customer_email, subject, business_name, sign_off, reply_id } = await req.json();

  // Validation
  if (!reply_text || reply_text.trim().length < 10) {
    return NextResponse.json({ error: "Reply text must be at least 10 characters." }, { status: 400 });
  }

  if (!customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
    return NextResponse.json({ error: "Valid customer email is required." }, { status: 400 });
  }

  if (!subject || subject.trim().length < 3) {
    return NextResponse.json({ error: "Subject must be at least 3 characters." }, { status: 400 });
  }

  // Check plan limit
  const user = await getUser(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const plan = user.plan ?? "free";

  // Count existing sends this month
  const { count, error: countError } = await supabase
    .from("reply_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("sent_via_email", true)
    .gte("sent_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  if (countError) {
    return NextResponse.json({ error: "Failed to check usage" }, { status: 500 });
  }

  if (!isEmailUnderLimit(plan, count || 0)) {
    return NextResponse.json(
      { error: "email_limit_reached", message: `You've used your ${plan} plan's email sends this month. Upgrade to send more.` },
      { status: 403 }
    );
  }

  // Send the email
  const result = await sendReply({
    customer_email,
    subject,
    reply_text,
    business_name: business_name || "Your business",
    sign_off,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to send email. Please try again." },
      { status: 500 }
    );
  }

  // Update reply history if reply_id provided
  if (reply_id) {
    await supabase
      .from("reply_history")
      .update({
        sent_via_email: true,
        sent_at: new Date().toISOString(),
        customer_email,
        email_subject: subject,
      })
      .eq("id", reply_id)
      .eq("user_id", userId);
  }

  return NextResponse.json({ success: true, email_id: result.email_id });
}
