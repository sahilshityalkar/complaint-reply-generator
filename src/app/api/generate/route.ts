import { NextResponse } from "next/server";
import { groq, MODEL } from "@/lib/groq";

export async function POST(req: Request) {
  const { complaint, tone, bizType } = await req.json();

  if (!complaint || complaint.trim().length < 20) {
    return NextResponse.json(
      { error: "Complaint must be at least 20 characters." },
      { status: 400 }
    );
  }

  const prompt = `You are a professional customer service expert helping a ${bizType} owner respond to a difficult customer complaint with empathy and professionalism.

The customer wrote:
"""
${complaint}
"""

Generate exactly 3 different professional reply variations. The user's preferred primary tone is: ${tone}.

Return ONLY valid JSON in this exact format, no extra text, no markdown:
{
  "replies": [
    {
      "label": "Empathetic & Understanding",
      "tone": "empathetic",
      "text": "..."
    },
    {
      "label": "Firm & Solution-Focused",
      "tone": "firm",
      "text": "..."
    },
    {
      "label": "Apologetic & Generous",
      "tone": "apologetic",
      "text": "..."
    }
  ]
}

Rules for every reply:
- 3 to 5 sentences maximum
- Professional but human — not robotic
- Address the specific issue mentioned (do not give generic replies)
- Do not include placeholder text like [Your Name] or [Order Number]
- The first reply must match the requested tone (${tone}) most closely
- Each reply should be meaningfully different from the others
- For ${bizType}: use industry-appropriate language and empathy`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const raw = completion.choices[0].message.content ?? "";
    const { replies } = JSON.parse(raw);
    return NextResponse.json({ replies });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate replies. Please try again." },
      { status: 500 }
    );
  }
}
