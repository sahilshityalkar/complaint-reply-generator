import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfiles, createProfile } from "@/lib/voice";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profiles = await getProfiles(userId);
  return NextResponse.json({ profiles });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const profile = await createProfile(userId, body);
  return NextResponse.json({ profile }, { status: 201 });
}
