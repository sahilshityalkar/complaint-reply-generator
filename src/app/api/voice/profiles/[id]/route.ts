import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfile, updateProfile, deleteProfile, setDefaultProfile } from "@/lib/voice";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const profile = await getProfile(id, userId);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ profile });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Handle set_default separately and strip it from the body
  const { set_default, ...cleanBody } = body;

  if (set_default) {
    await setDefaultProfile(id, userId);
  }

  const profile = await updateProfile(id, userId, cleanBody);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ profile });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteProfile(id, userId);
  return NextResponse.json({ success: true });
}
