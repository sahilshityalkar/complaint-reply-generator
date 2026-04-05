import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUser, getUsage } from "@/lib/usage";
import { PLAN_LIMITS } from "@/lib/plans";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUser(userId);
  const plan = user?.plan ?? "free";
  const usage = await getUsage(userId);
  const count = usage?.reply_count ?? 0;
  const limit = PLAN_LIMITS[plan];

  return NextResponse.json({ count, limit, plan });
}
