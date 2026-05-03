import { supabase } from "../supabase";
import { ConnectorConfig } from "./types";

const BUCKET = "user-options";

function getKey(userId: string): string {
  return `${userId}_connectors.json`;
}

export async function getConnectors(
  userId: string
): Promise<ConnectorConfig[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(getKey(userId));
  if (error || !data) return [];
  try {
    const parsed = JSON.parse(await data.text());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveConnectors(
  userId: string,
  connectors: ConnectorConfig[]
): Promise<void> {
  const blob = new Blob([JSON.stringify(connectors)], {
    type: "application/json",
  });
  await supabase.storage
    .from(BUCKET)
    .upload(getKey(userId), blob, { upsert: true });
}

export async function getConnector(
  userId: string,
  connectorId: string
): Promise<ConnectorConfig | null> {
  const connectors = await getConnectors(userId);
  return connectors.find((c) => c.id === connectorId) || null;
}

export async function addConnector(
  userId: string,
  config: Omit<ConnectorConfig, "created_at" | "updated_at">
): Promise<ConnectorConfig[]> {
  const connectors = await getConnectors(userId);
  const now = new Date().toISOString();
  const entry: ConnectorConfig = { ...config, created_at: now, updated_at: now };
  connectors.push(entry);
  await saveConnectors(userId, connectors);
  return connectors;
}

export async function removeConnector(
  userId: string,
  connectorId: string
): Promise<void> {
  const connectors = await getConnectors(userId);
  await saveConnectors(
    userId,
    connectors.filter((c) => c.id !== connectorId)
  );
}

export async function getEnabledFunctions(
  userId: string
): Promise<Array<{ connector: ConnectorConfig; fn: any }>> {
  const connectors = await getConnectors(userId);
  const result: Array<{ connector: ConnectorConfig; fn: any }> = [];
  for (const c of connectors) {
    if (!c.enabled) continue;
    for (const fn of c.functions || []) {
      result.push({ connector: c, fn });
    }
  }
  return result;
}
