import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getTemplates,
  addTemplate,
  deleteTemplate,
  renameTemplate,
} from "@/lib/reply-templates";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await getTemplates(userId);
  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, value } = await req.json();

  if (!action || !value) {
    return NextResponse.json(
      { error: "action and value are required" },
      { status: 400 }
    );
  }

  try {
    let templates;

    if (action === "add") {
      const { name, reply_text, tone, biz_type } = value;
      if (!name || !reply_text) {
        return NextResponse.json(
          { error: "name and reply_text are required" },
          { status: 400 }
        );
      }
      templates = await addTemplate(userId, {
        name,
        reply_text,
        tone: tone || "",
        biz_type: biz_type || "",
      });
    } else if (action === "delete") {
      templates = await deleteTemplate(userId, value.id);
    } else if (action === "rename") {
      templates = await renameTemplate(userId, value.id, value.name);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, templates });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update templates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
