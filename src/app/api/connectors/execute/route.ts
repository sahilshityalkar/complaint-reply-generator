import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConnector } from "@/lib/connectors/storage";
import { executeFunction } from "@/lib/connectors/query-executor";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { connectorId, functionName, params } = await req.json();

  if (!connectorId || !functionName) {
    return NextResponse.json(
      { error: "connectorId and functionName required" },
      { status: 400 }
    );
  }

  const connector = await getConnector(userId, connectorId);
  if (!connector) {
    return NextResponse.json(
      { error: "Connector not found" },
      { status: 404 }
    );
  }

  const fn = connector.functions?.find((f) => f.name === functionName);
  if (!fn) {
    return NextResponse.json(
      { error: `Function '${functionName}' not found` },
      { status: 404 }
    );
  }

  const result = await executeFunction(connector, fn, params || {});

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result.data,
    rowCount: result.rowCount,
    queryTimeMs: result.queryTimeMs,
  });
}
