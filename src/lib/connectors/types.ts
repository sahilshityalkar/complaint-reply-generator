// Shared types for database connectors
// Every connector type produces these standard formats

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  sampleValue?: string;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  sampleRows: Record<string, any>[];
  estimatedRowCount: number;
}

export interface FunctionDef {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
  returns: {
    description: string;
  };
  query: {
    type: "sql" | "mongo" | "rest";
    template: string;
    paramMap: string[];
  };
}

export interface ConnectorConfig {
  id: string;
  type: "postgres" | "mongodb" | "supabase" | "rest";
  displayName: string;
  enabled: boolean;
  connection: {
    encrypted_credentials: string;
  };
  schema: TableInfo[];
  functions: FunctionDef[];
  created_at: string;
  updated_at: string;
}
