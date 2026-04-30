import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateVoiceFromUrl, generateVoiceFromQuiz } from "@/lib/voice";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { method, ...params } = body;

  let voice_dna: string;

  if (method === "url") {
    voice_dna = await generateVoiceFromUrl(params.website_url, params.business_name, params.industry);
  } else if (method === "quiz") {
    voice_dna = await generateVoiceFromQuiz(params);
  } else {
    return NextResponse.json({ error: "Invalid method. Use 'url' or 'quiz'." }, { status: 400 });
  }

  return NextResponse.json({ voice_dna });
}
