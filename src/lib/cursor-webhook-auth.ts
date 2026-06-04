/**
 * Cursor Automations webhook helpers.
 *
 * Automation webhooks are *asynchronous*: POSTing to the webhook URL returns
 * { success, backgroundComposerId } immediately.  The actual AI result arrives
 * later, once the cloud agent finishes.  To retrieve it we poll:
 *
 *   1. GET /v1/agents/{agentId}         → latestRunId
 *   2. GET /v1/agents/{agentId}/runs/{runId} → status, result
 *
 * The same crsr_… token used for the webhook works for the Cloud Agents API.
 */

const CURSOR_API_BASE = "https://api.cursor.com";
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_MS = 180_000;

export function buildCursorWebhookAuthorization(
  routeToken: string | undefined,
): string | null {
  const shared = process.env.CURSOR_WEBHOOK_AUTH_TOKEN?.trim() ?? "";
  const raw = (routeToken?.trim() || shared).trim();
  if (!raw) return null;
  if (/^bearer\s+/i.test(raw)) return raw;
  return `Bearer ${raw}`;
}

export function applyCustomWebhookHeader(
  headers: Record<string, string>,
  headerName: string | undefined,
  headerValue: string | undefined,
): void {
  const name = headerName?.trim() ?? "";
  const value = headerValue?.trim() ?? "";
  if (name && value) headers[name] = value;
}

interface WebhookTriggerResponse {
  success: boolean;
  backgroundComposerId: string;
}

interface RunResult {
  id: string;
  agentId: string;
  status: string;
  result?: string;
  durationMs?: number;
}

/**
 * POST to a Cursor automation webhook and then poll the Cloud Agents API
 * until the agent finishes, returning the final `result` text.
 */
export async function triggerAndWaitForResult(opts: {
  webhookUrl: string;
  authToken: string;
  payload: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<{ ok: true; resultText: string } | { ok: false; errorCode: number; detail: string }> {
  const authorization = buildCursorWebhookAuthorization(opts.authToken);
  if (!authorization) {
    return { ok: false, errorCode: 102, detail: "No auth token configured" };
  }

  // --- Step 1: trigger the webhook ---
  let triggerRes: Response;
  try {
    triggerRes = await fetch(opts.webhookUrl, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(opts.payload),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED"))
      return { ok: false, errorCode: 204, detail: `Network error: ${msg}` };
    return { ok: false, errorCode: 201, detail: `Webhook fetch failed: ${msg}` };
  }

  if (!triggerRes.ok) {
    const snippet = await triggerRes.text().catch(() => "");
    if (triggerRes.status === 401 || triggerRes.status === 403)
      return { ok: false, errorCode: 202, detail: `Auth rejected (${triggerRes.status}): ${snippet.slice(0, 200)}` };
    if (triggerRes.status === 404)
      return { ok: false, errorCode: 205, detail: "Webhook URL not found (404)" };
    return { ok: false, errorCode: 201, detail: `Webhook HTTP ${triggerRes.status}: ${snippet.slice(0, 200)}` };
  }

  let trigger: WebhookTriggerResponse;
  try {
    trigger = await triggerRes.json() as WebhookTriggerResponse;
  } catch {
    return { ok: false, errorCode: 207, detail: "Webhook response is not JSON" };
  }

  if (!trigger.backgroundComposerId) {
    return { ok: false, errorCode: 207, detail: "Webhook response missing backgroundComposerId" };
  }

  const agentId = trigger.backgroundComposerId;

  // --- Step 2: poll the Cloud Agents API for the run result ---
  const deadline = Date.now() + MAX_POLL_MS;

  let runId: string | null = null;
  while (Date.now() < deadline) {
    if (opts.signal?.aborted) {
      return { ok: false, errorCode: 203, detail: "Aborted by caller" };
    }

    try {
      // Get agent to find latestRunId
      if (!runId) {
        const agentRes = await fetch(`${CURSOR_API_BASE}/v1/agents/${agentId}`, {
          headers: { Authorization: authorization },
          signal: AbortSignal.timeout(10_000),
        });
        if (agentRes.ok) {
          const agentData = await agentRes.json() as { latestRunId?: string };
          if (agentData.latestRunId) {
            runId = agentData.latestRunId;
          }
        }
      }

      // Poll the run
      if (runId) {
        const runRes = await fetch(`${CURSOR_API_BASE}/v1/agents/${agentId}/runs/${runId}`, {
          headers: { Authorization: authorization },
          signal: AbortSignal.timeout(10_000),
        });
        if (runRes.ok) {
          const run = await runRes.json() as RunResult;
          if (run.status === "FINISHED") {
            return { ok: true, resultText: run.result ?? "" };
          }
          if (run.status === "ERROR" || run.status === "CANCELLED" || run.status === "EXPIRED") {
            return { ok: false, errorCode: 206, detail: `Agent run ended with status: ${run.status}` };
          }
        }
      }
    } catch {
      // Transient network error during polling — keep trying
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  return { ok: false, errorCode: 203, detail: "Timed out waiting for agent to finish" };
}
