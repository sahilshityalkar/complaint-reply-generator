import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { groq, MODEL } from "@/lib/groq";
import { getUser, createUser, checkLimit, incrementUsage } from "@/lib/usage";
import { supabase } from "@/lib/supabase";
import { getProfile, getDefaultProfile, buildGeneratePrompt } from "@/lib/voice";

export async function POST(req: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { complaint, tone, bizType, profile_id } = await req.json();

  if (!complaint || complaint.trim().length < 20) {
    return NextResponse.json(
      { error: "Complaint must be at least 20 characters." },
      { status: 400 }
    );
  }

  // Get or auto-create user in DB (handles users who signed up before webhook was configured)
  let user = await getUser(userId);
  if (!user) {
    const email = sessionClaims?.email as string ?? "";
    await createUser(userId, email);
    user = await getUser(userId);
  }

  // Check usage limit
  const underLimit = await checkLimit(userId);
  if (!underLimit) {
    return NextResponse.json(
      { error: "limit_reached" },
      { status: 403 }
    );
  }

  // Load brand profile (or use default)
  const profile = profile_id
    ? await getProfile(profile_id, userId)
    : await getDefaultProfile(userId);

  const prompt = buildGeneratePrompt({
    complaint,
    tone,
    bizType,
    profile: profile || undefined,
  });

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const raw = completion.choices[0].message.content ?? "";
    const { replies } = JSON.parse(raw);

    await incrementUsage(userId);

    // Save to reply history (fire and forget — don't block the response)
    supabase.from("reply_history").insert({
      user_id: userId,
      complaint,
      tone,
      business_type: bizType,
      replies,
      profile_id: profile?.id || null,
    }).then(() => null);

    return NextResponse.json({ replies });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate replies. Please try again." },
      { status: 500 }
    );
  }
}
