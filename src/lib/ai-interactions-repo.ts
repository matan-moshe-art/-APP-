import type { InputMode } from "@/lib/app-types";
import { getPostgresPool } from "@/lib/db-postgres";

export type InteractionFeature = "analyze" | "summarize";

export type InteractionStatus = "started" | "succeeded" | "failed";

export type CreateInteractionInput = {
  feature: InteractionFeature;
  inputMode: InputMode;
  userMessage: string;
};

async function safeQuery<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[ai-interactions] ${label}:`, err);
    return null;
  }
}

export async function createInteractionLog(
  input: CreateInteractionInput,
): Promise<string | null> {
  const db = getPostgresPool();
  if (!db) return null;

  return safeQuery("createInteractionLog", async () => {
    const result = await db.query<{ id: string }>(
      `INSERT INTO ai_interactions (feature, input_mode, user_message, status)
       VALUES ($1, $2, $3, 'started')
       RETURNING id`,
      [input.feature, input.inputMode, input.userMessage],
    );
    return result.rows[0]?.id ?? null;
  });
}

export async function markInteractionSuccess(
  id: string | null,
  aiResponse: unknown,
): Promise<void> {
  if (!id) return;
  const db = getPostgresPool();
  if (!db) return;

  const serialized =
    typeof aiResponse === "string"
      ? aiResponse
      : JSON.stringify(aiResponse);

  await safeQuery("markInteractionSuccess", async () => {
    await db.query(
      `UPDATE ai_interactions
       SET ai_response = $2, status = 'succeeded', completed_at = NOW()
       WHERE id = $1`,
      [id, serialized],
    );
  });
}

export async function markInteractionFailure(
  id: string | null,
  errorCode: string,
): Promise<void> {
  if (!id) return;
  const db = getPostgresPool();
  if (!db) return;

  await safeQuery("markInteractionFailure", async () => {
    await db.query(
      `UPDATE ai_interactions
       SET status = 'failed', error_code = $2, completed_at = NOW()
       WHERE id = $1`,
      [id, errorCode],
    );
  });
}
