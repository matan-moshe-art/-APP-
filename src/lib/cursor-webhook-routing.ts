import type { InputMode } from "@/lib/app-types";

export type WebhookFeature = "analyze" | "summarize";

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/**
 * Resolves Cursor automation webhook URL + auth token for analyze/summarize and short/long.
 * Per-mode env vars win; legacy ANALYZE_/SUMMARIZE_WEBHOOK_* (no suffix) applies to short only.
 */
export function resolveCursorWebhook(
  feature: WebhookFeature,
  mode: InputMode,
): { url: string; authToken: string } {
  const prefix = feature === "analyze" ? "ANALYZE" : "SUMMARIZE";
  const modeKey = mode === "short" ? "SHORT" : "LONG";

  const url =
    readEnv(`${prefix}_WEBHOOK_URL_${modeKey}`) ||
    (mode === "short" ? readEnv(`${prefix}_WEBHOOK_URL`) : "");

  const authToken =
    readEnv(`${prefix}_WEBHOOK_AUTH_TOKEN_${modeKey}`) ||
    (mode === "short" ? readEnv(`${prefix}_WEBHOOK_AUTH_TOKEN`) : "");

  return { url, authToken };
}

export function isWebhookConfigured(config: {
  url: string;
  authToken: string;
}): boolean {
  return Boolean(config.url && config.authToken);
}
