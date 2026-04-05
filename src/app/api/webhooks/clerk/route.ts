import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { createUser, getUser } from "@/lib/usage";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify the webhook signature using svix
  const headersList = await headers();
  const svixId = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");
  const svixSignature = headersList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const { type, data } = event;
  const userId = data.id as string;
  const emailAddress = (
    (data.email_addresses as Array<{ email_address: string }>)?.[0]?.email_address ?? ""
  );

  if (type === "user.created") {
    await createUser(userId, emailAddress);
  }

  if (type === "user.updated") {
    const existing = await getUser(userId);
    if (existing && emailAddress && existing.email !== emailAddress) {
      await supabase
        .from("users")
        .update({ email: emailAddress })
        .eq("id", userId);
    }
  }

  if (type === "user.deleted") {
    await supabase.from("users").delete().eq("id", userId);
  }

  return NextResponse.json({ received: true });
}
