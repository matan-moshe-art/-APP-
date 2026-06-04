import { NextResponse } from "next/server";
import { SUMMARIZE_SYSTEM_PROMPT } from "@/lib/summarize-prompt";
import { LOCAL_USER_ID } from "@/lib/billing/auth";
import { userHasActiveSubscription } from "@/lib/billing/entitlement";
import { triggerAndWaitForResult } from "@/lib/cursor-webhook-auth";

const MIN_LEN = 10;
const MAX_LEN = 5000;
const SUMMARIZE_WEBHOOK_URL =
  process.env.SUMMARIZE_WEBHOOK_URL ??
  "https://api2.cursor.sh/automations/webhook/38d045b9-ceac-4f97-8198-3e2212abe645";
const SUMMARIZE_WEBHOOK_AUTH_TOKEN =
  process.env.SUMMARIZE_WEBHOOK_AUTH_TOKEN?.trim() ?? "";

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
  const entitled = await userHasActiveSubscription(LOCAL_USER_ID);
  if (!entitled) {
    return NextResponse.json(
      {
        error: "subscription_required",
        message: "כדי לקבל סיכום צריך מנוי פעיל. אפשר להפעיל במסך המנוי.",
      },
      { status: 402 },
    );
  }

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

  if (!trimmed) {
    return NextResponse.json(
      { error: "empty", message: "יש להדביק טקסט לפני הסיכום" },
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

  const outcome = await triggerAndWaitForResult({
    webhookUrl: SUMMARIZE_WEBHOOK_URL,
    authToken: SUMMARIZE_WEBHOOK_AUTH_TOKEN,
    payload: { text: trimmed, prompt: SUMMARIZE_SYSTEM_PROMPT },
  });

  if (!outcome.ok) {
    console.error(`Summarize webhook failed [${outcome.errorCode}]: ${outcome.detail}`);
    return NextResponse.json(
      { error: "webhook_error", ...withEventCode(outcome.errorCode) },
      { status: 502 },
    );
  }

  const parsed = extractSummarizeResult(outcome.resultText);
  if (parsed) {
    return NextResponse.json(parsed);
  }

  console.error("Could not extract summarize result from agent output:", outcome.resultText.slice(0, 500));
  return NextResponse.json(
    { error: "webhook_unrecognized_response", ...withEventCode(207) },
    { status: 502 },
  );
}
