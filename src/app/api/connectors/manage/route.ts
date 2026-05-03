import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getConnectors,
  addConnector,
  removeConnector,
} from "@/lib/connectors/storage";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connectors = await getConnectors(userId);
  return NextResponse.json({ connectors });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, value } = await req.json();

  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  try {
    if (action === "add") {
      const connectors = await addConnector(userId, value);
      return NextResponse.json({ success: true, connectors });
    }
    if (action === "remove") {
      await removeConnector(userId, value.id);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
