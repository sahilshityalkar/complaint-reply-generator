import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { discoverPostgres } from "@/lib/connectors/postgres-discover";
import { generateFunctions } from "@/lib/connectors/function-generator";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, connectionString } = await req.json();
  if (!type || !connectionString) {
    return NextResponse.json(
      { error: "type and connectionString required" },
      { status: 400 }
    );
  }

  try {
    const tables = await discoverPostgres(connectionString);

    if (tables.length === 0) {
      return NextResponse.json({
        success: true,
        tables: [],
        functions: [],
        warning: "No tables found in database.",
      });
    }

    const functions = generateFunctions(tables);

    return NextResponse.json({
      success: true,
      tables,
      functions,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Discovery failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
