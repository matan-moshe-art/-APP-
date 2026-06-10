import { NextResponse } from "next/server";
import type { InputMode } from "@/lib/app-types";
import {
  createInteractionLog,
  markInteractionFailure,
  markInteractionSuccess,
} from "@/lib/ai-interactions-repo";
import {
  limitsForMode,
  resolveSystemPrompt,
} from "@/lib/prompt-routing";
import { triggerAndWaitForResult } from "@/lib/cursor-webhook-auth";
import { resolveCursorWebhook } from "@/lib/cursor-webhook-routing";

function parseInputMode(body: unknown): InputMode {
  if (
    typeof body === "object" &&
    body !== null &&
    "inputType" in body &&
    (body as { inputType?: unknown }).inputType === "short"
  ) {
    return "short";
  }
  return "long";
}
const USER_ERROR_PREFIX =
  "לא הצלחנו להשלים את הבקשה כרגע. נסו שוב בעוד רגע.";

function withEventCode(code: number): {
  eventCode: string;
  message: string;
} {
  const eventCode = `SM-${code}`;
  return {
    eventCode,
    message: `${USER_ERROR_PREFIX} קוד אירוע: ${eventCode}`,
  };
}

type SummarizeResult = {
  topic: string;
  urgency: string;
  actions: string;
  recommendations: string;
};

function isSummarizeResult(r: Record<string, unknown>): boolean {
  return (
    typeof r.topic === "string" &&
    r.topic.trim().length > 0 &&
    typeof r.urgency === "string" &&
    r.urgency.trim().length > 0 &&
    typeof r.actions === "string" &&
    r.actions.trim().length > 0 &&
    typeof r.recommendations === "string" &&
    r.recommendations.trim().length > 0
  );
}

function extractSummarizeResult(raw: unknown): SummarizeResult | null {
  const queue: unknown[] = [raw];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (typeof current === "string") {
      try {
        queue.push(JSON.parse(current));
      } catch {
        const m = current.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            queue.push(JSON.parse(m[0]));
          } catch {
            /* not JSON */
          }
        }
      }
      continue;
    }

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    if (typeof current !== "object") continue;
    const obj = current as Record<string, unknown>;

    if (isSummarizeResult(obj)) {
      return {
        topic: String(obj.topic).trim(),
        urgency: String(obj.urgency).trim(),
        actions: String(obj.actions).trim(),
        recommendations: String(obj.recommendations).trim(),
      };
    }

    queue.push(obj.output, obj.result, obj.data, obj.json, obj.body, obj.response);
    for (const value of Object.values(obj)) queue.push(value);
  }

  return null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const text =
    typeof body === "object" && body !== null && "text" in body
      ? String((body as { text?: unknown }).text ?? "")
      : "";

  const trimmed = text.trim();
  const inputMode = parseInputMode(body);
  const { min: MIN_LEN, max: MAX_LEN } = limitsForMode(inputMode);
  const systemPrompt = resolveSystemPrompt("summarizer", inputMode);

  if (!trimmed) {
    return NextResponse.json(
      { error: "empty", message: "הוסיפו הודעה או PDF לפני ההתחלה." },
      { status: 400 },
    );
  }
  if (trimmed.length < MIN_LEN) {
    return NextResponse.json(
      { error: "too_short", message: "הטקסט קצר מדי לסיכום" },
      { status: 400 },
    );
  }
  if (trimmed.length > MAX_LEN) {
    return NextResponse.json(
      { error: "too_long", message: "הטקסט ארוך מדי. נסו לקצר או להדביק את החלק העיקרי" },
      { status: 400 },
    );
  }

  const logId = await createInteractionLog({
    feature: "summarize",
    inputMode,
    userMessage: trimmed,
  });

  const { url: summarizeWebhookUrl, authToken: summarizeWebhookAuthToken } =
    resolveCursorWebhook("summarize", inputMode);

  const outcome = await triggerAndWaitForResult({
    webhookUrl: summarizeWebhookUrl,
    authToken: summarizeWebhookAuthToken,
    payload: { text: trimmed, prompt: systemPrompt, inputType: inputMode },
  });

  if (!outcome.ok) {
    console.error(`Summarize webhook failed [${outcome.errorCode}]: ${outcome.detail}`);
    const { eventCode } = withEventCode(outcome.errorCode);
    await markInteractionFailure(logId, eventCode);
    return NextResponse.json(
      { error: "webhook_error", ...withEventCode(outcome.errorCode) },
      { status: 502 },
    );
  }

  const parsed = extractSummarizeResult(outcome.resultText);
  if (parsed) {
    await markInteractionSuccess(logId, parsed);
    return NextResponse.json(parsed);
  }

  console.error("Could not extract summarize result from agent output:", outcome.resultText.slice(0, 500));
  const { eventCode } = withEventCode(207);
  await markInteractionFailure(logId, eventCode);
  return NextResponse.json(
    { error: "webhook_unrecognized_response", ...withEventCode(207) },
    { status: 502 },
  );
}
