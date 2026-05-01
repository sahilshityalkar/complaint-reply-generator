import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getUserOptions,
  addCustomTone,
  removeCustomTone,
  addCustomBizType,
  removeCustomBizType,
} from "@/lib/user-options";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const options = await getUserOptions(userId);
  return NextResponse.json(options);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, action, value } = await req.json();

  if (!type || !action || !value) {
    return NextResponse.json(
      { error: "type (tone|biz-type), action (add|remove), and value are required" },
      { status: 400 }
    );
  }

  try {
    let result: string[];

    if (type === "tone") {
      if (action === "add") {
        result = await addCustomTone(userId, value);
      } else if (action === "remove") {
        result = await removeCustomTone(userId, value);
      } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    } else if (type === "biz-type") {
      if (action === "add") {
        result = await addCustomBizType(userId, value);
      } else if (action === "remove") {
        result = await removeCustomBizType(userId, value);
      } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, items: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update options";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
