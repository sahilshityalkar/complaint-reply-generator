import { ConnectorConfig, FunctionDef } from "./types";

export interface ExecutedQuery {
  success: boolean;
  data?: Record<string, any>[];
  rowCount?: number;
  error?: string;
  queryTimeMs?: number;
}

function decodeCredentials(encrypted: string): string {
  try {
    return Buffer.from(encrypted, "base64").toString("utf-8");
  } catch {
    return encrypted;
  }
}

export async function executeFunction(
  connector: ConnectorConfig,
  functionDef: FunctionDef,
  params: Record<string, string>
): Promise<ExecutedQuery> {
  const startTime = Date.now();

  try {
    const connectionString = decodeCredentials(
      connector.connection.encrypted_credentials
    );

    const paramValues: string[] = [];
    for (const param of functionDef.parameters) {
      const val = params[param.name];
      if (!val && param.required) {
        return { success: false, error: `Missing: ${param.name}` };
      }
      paramValues.push(val || "");
    }

    const { Pool } = require("pg");
    const pool = new Pool({
      connectionString,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 3000,
      statement_timeout: 5000,
    });

    try {
      const { rows } = await pool.query(
        functionDef.query.template,
        paramValues
      );
      return {
        success: true,
        data: rows.slice(0, 10),
        rowCount: rows.length,
        queryTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "Query failed",
        queryTimeMs: Date.now() - startTime,
      };
    } finally {
      await pool.end();
    }
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Connection failed",
      queryTimeMs: Date.now() - startTime,
    };
  }
}
