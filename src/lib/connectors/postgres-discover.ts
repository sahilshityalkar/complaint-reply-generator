import { TableInfo } from "./types";

export async function discoverPostgres(
  connectionString: string
): Promise<TableInfo[]> {
  // Dynamically require pg to avoid build issues
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString,
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });

  try {
    const { rows: tables } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
      LIMIT 30
    `);

    if (tables.length === 0) {
      throw new Error("No user tables found in database");
    }

    const results: TableInfo[] = [];

    for (const { table_name } of tables) {
      const { rows: columns } = await pool.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = $1
           AND table_schema NOT IN ('information_schema', 'pg_catalog')
         ORDER BY ordinal_position`,
        [table_name]
      );

      if (columns.length === 0 || columns.length > 50) continue;

      let sampleRows: Record<string, any>[] = [];
      try {
        const { rows: samples } = await pool.query(
          `SELECT * FROM "${table_name}" LIMIT 2`
        );
        sampleRows = samples;
      } catch {}

      let estimatedRowCount = 0;
      try {
        const { rows: cr } = await pool.query(
          "SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = $1",
          [table_name]
        );
        estimatedRowCount = cr[0]?.estimate || 0;
      } catch {}

      results.push({
        name: table_name,
        columns: columns.map((c: any) => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === "YES",
          sampleValue: sampleRows[0]?.[c.column_name]
            ? String(sampleRows[0][c.column_name]).substring(0, 100)
            : undefined,
        })),
        sampleRows,
        estimatedRowCount,
      });
    }

    return results;
  } finally {
    await pool.end();
  }
}
