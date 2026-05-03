import { TableInfo, ColumnInfo, FunctionDef } from "./types";

function findColumn(table: TableInfo, candidates: string[]): ColumnInfo | null {
  const cols = table.columns.map((c) => c.name.toLowerCase());
  for (const candidate of candidates) {
    const idx = cols.indexOf(candidate);
    if (idx >= 0) return table.columns[idx];
  }
  return null;
}

function describeColumns(table: TableInfo, exclude: ColumnInfo): string {
  return table.columns
    .filter((c) => c.name !== exclude.name)
    .map((c) => c.name)
    .slice(0, 8)
    .join(", ") || "all fields";
}

function buildSearchQuery(table: TableInfo): string {
  const textCols = table.columns
    .filter(
      (c) =>
        c.type.includes("char") ||
        c.type.includes("text") ||
        c.type === "text" ||
        c.name.includes("name") ||
        c.name.includes("email") ||
        c.name.includes("phone")
    )
    .slice(0, 3);

  if (textCols.length === 0) {
    return `SELECT * FROM "${table.name}" LIMIT 5`;
  }

  const conditions = textCols
    .map((c, i) => `"${c.name}" ILIKE '%' || $1 || '%'`)
    .join(" OR ");

  return `SELECT * FROM "${table.name}" WHERE ${conditions} LIMIT 5`;
}

function makeFunction(
  table: TableInfo,
  idCol: ColumnInfo,
  desc: string,
  paramDesc: string
): FunctionDef {
  return {
    name: `lookup_${table.name}`,
    description: desc,
    parameters: [
      {
        name: "id",
        type: "string",
        description: paramDesc,
        required: true,
      },
    ],
    returns: { description: describeColumns(table, idCol) },
    query: {
      type: "sql",
      template: `SELECT * FROM "${table.name}" WHERE "${idCol.name}" = $1 LIMIT 1`,
      paramMap: ["id"],
    },
  };
}

function makeSearch(table: TableInfo): FunctionDef {
  return {
    name: `search_${table.name}`,
    description: `Search ${table.name} by customer name, email, or phone`,
    parameters: [
      {
        name: "query",
        type: "string",
        description: "Search term (name, email, or phone)",
        required: true,
      },
    ],
    returns: { description: `Matching ${table.name} records (up to 5)` },
    query: {
      type: "sql",
      template: buildSearchQuery(table),
      paramMap: ["query"],
    },
  };
}

export function generateFunctions(tables: TableInfo[]): FunctionDef[] {
  const functions: FunctionDef[] = [];
  const used: Set<string> = new Set();

  for (const table of tables) {
    const tn = table.name.toLowerCase();

    // Order/transaction tables
    if (
      tn.includes("order") ||
      tn.includes("purchase") ||
      tn.includes("transaction") ||
      tn.includes("sale")
    ) {
      const idCol = findColumn(table, [
        "order_number",
        "order_id",
        "id",
        "txn_id",
        "transaction_id",
        "reference",
        "ref_no",
        "order_no",
      ]);
      if (idCol) {
        functions.push(
          makeFunction(
            table,
            idCol,
            `Get full details for ${table.name} by its ${idCol.name}. Returns order status, tracking, items, and dates.`,
            `The ${idCol.name} to look up`
          )
        );
        used.add(table.name);
      }
    }

    // Customer tables
    if (
      tn.includes("customer") ||
      tn.includes("user") ||
      tn.includes("client") ||
      tn.includes("buyer")
    ) {
      const col = findColumn(table, [
        "email",
        "phone",
        "mobile",
        "contact",
        "email_address",
      ]);
      if (col) {
        functions.push(
          makeFunction(
            table,
            col,
            `Get customer details by ${col.name}. Returns name, contact info, and order history.`,
            `The ${col.name} to look up`
          )
        );
        used.add(table.name);
      }
    }

    // Product/inventory tables
    if (
      tn.includes("product") ||
      tn.includes("item") ||
      tn.includes("inventory") ||
      tn.includes("stock") ||
      tn.includes("sku")
    ) {
      const idCol = findColumn(table, [
        "product_id",
        "item_id",
        "sku",
        "id",
        "barcode",
        "product_code",
      ]);
      if (idCol) {
        functions.push(
          makeFunction(
            table,
            idCol,
            `Get product details including price, availability, and description.`,
            `The ${idCol.name} to look up`
          )
        );
        used.add(table.name);
      }
    }

    // Refund/return/dispute tables
    if (
      tn.includes("refund") ||
      tn.includes("return") ||
      tn.includes("complaint") ||
      tn.includes("ticket") ||
      tn.includes("dispute")
    ) {
      const orderCol = findColumn(table, [
        "order_id",
        "order_number",
        "ref_order",
        "transaction_id",
      ]);
      if (orderCol) {
        functions.push(
          makeFunction(
            table,
            orderCol,
            `Check the status of a ${table.name} by its order ID. Returns status, amount, and resolution date.`,
            "The order ID to check"
          )
        );
        used.add(table.name);
      }
    }
  }

  // Fallback: for any table without a specific function, create generic lookup
  for (const table of tables) {
    if (!used.has(table.name)) {
      const idCol = findColumn(table, [
        "id",
        "uuid",
        "key",
        "code",
        "number",
        "ref",
      ]);
      if (idCol) {
        functions.push(
          makeFunction(
            table,
            idCol,
            `Look up a record in the "${table.name}" table by ${idCol.name}.`,
            `The ${idCol.name} to search for`
          )
        );
      }
    }
  }

  // Add search function for tables with text columns
  for (const table of tables) {
    const hasText = table.columns.some(
      (c) => c.type.includes("char") || c.type.includes("text") || c.type === "text"
    );
    if (hasText && table.estimatedRowCount < 50000) {
      functions.push(makeSearch(table));
      break; // one search function is enough
    }
  }

  return functions.slice(0, 10);
}
