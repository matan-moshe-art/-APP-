import type { InputMode } from "@/lib/app-types";

export type WebhookFeature = "analyze" | "summarize";

const DEFAULT_WEBHOOK_URL: Record<WebhookFeature, Record<InputMode, string>> = {
  summarize: {
    short:
      "https://api2.cursor.sh/automations/webhook/38d045b9-ceac-4f97-8198-3e2212abe645",
    long:
      "https://api2.cursor.sh/automations/webhook/3d20c054-2e36-40df-bc77-3c0519043cd0",
  },
  analyze: {
    short:
      "https://api2.cursor.sh/automations/webhook/b792b886-1381-47fc-94d6-23f4f66e7d4b",
    long:
      "https://api2.cursor.sh/automations/webhook/c678e847-d155-47ac-81bc-b1e97cb3f85c",
  },
};

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
    (mode === "short" ? readEnv(`${prefix}_WEBHOOK_URL`) : "") ||
    DEFAULT_WEBHOOK_URL[feature][mode];

  const authToken =
    readEnv(`${prefix}_WEBHOOK_AUTH_TOKEN_${modeKey}`) ||
    (mode === "short" ? readEnv(`${prefix}_WEBHOOK_AUTH_TOKEN`) : "");

  return { url, authToken };
}
