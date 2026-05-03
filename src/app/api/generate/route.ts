import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { groq, MODEL } from "@/lib/groq";
import { getUser, createUser, checkLimit, incrementUsage } from "@/lib/usage";
import { supabase } from "@/lib/supabase";
import { getProfile, getDefaultProfile, buildGeneratePrompt } from "@/lib/voice";
import { getEnabledFunctions } from "@/lib/connectors/storage";
import { executeFunction } from "@/lib/connectors/query-executor";
import { parseFunctionCalls, stripFunctionCalls } from "@/lib/connectors/function-parser";

export async function POST(req: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { complaint, tone, bizType, profile_id, replyLength, language } = await req.json();

  if (!complaint || complaint.trim().length < 20) {
    return NextResponse.json(
      { error: "Complaint must be at least 20 characters." },
      { status: 400 }
    );
  }

  // Validate replyLength if provided
  const validLengths = ["short", "medium", "long"];
  const length = validLengths.includes(replyLength) ? replyLength : "medium";

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

  // Load enabled data connectors (if any)
  const enabledFns = await getEnabledFunctions(userId);
  const dataFunctions = enabledFns.map((ef) => ({
    name: ef.fn.name,
    description: ef.fn.description,
    parameters: ef.fn.parameters,
  }));

  const prompt = buildGeneratePrompt({
    complaint,
    tone,
    bizType,
    replyLength: length,
    language: language === "auto" ? undefined : language,
    profile: profile || undefined,
    dataFunctions: dataFunctions.length > 0 ? dataFunctions : undefined,
  });

  try {
    // Non-English languages need more tokens (Tamil, Bengali scripts are wider)
    const isMultilingual = language && language !== "auto" && language !== "english";
    const maxTokens = isMultilingual ? 1536 : (language === "auto" ? 2048 : 1024);

    let completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    let raw = completion.choices[0].message.content ?? "";

    // Check if the AI wants to call data functions
    const functionCalls = parseFunctionCalls(raw);
    let dataContext = "";

    for (const call of functionCalls.slice(0, 3)) {
      const fnInfo = enabledFns.find((ef) => ef.fn.name === call.name);
      if (!fnInfo) continue;

      try {
        const result = await executeFunction(fnInfo.connector, fnInfo.fn, call.params);
        if (result.success && result.data && result.data.length > 0) {
          dataContext += `\nDATA FROM ${call.name}(${JSON.stringify(call.params)}) :\n${JSON.stringify(result.data, null, 2)}\n`;
        }
      } catch {}
    }

    // If the AI made function calls, regenerate the reply with real data
    if (dataContext) {
      const followUpPrompt = `Here is the real data from the database:\n${dataContext}\n\nNow generate 3 professional reply variations using this real data. The user's preferred primary tone is: ${tone}. Return ONLY valid JSON.`;

      const followUp = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "user", content: prompt },
          { role: "assistant", content: raw },
          { role: "user", content: followUpPrompt },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      });

      raw = followUp.choices[0].message.content ?? "";
    }

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
