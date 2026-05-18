import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { SUMMARIZE_SYSTEM_PROMPT } from "@/lib/summarize-prompt";
import {
  markSummarizePending,
  completeSummarize,
  type SummarizeResult,
} from "@/lib/summarize-pending-store";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { userHasActiveSubscription } from "@/lib/billing/entitlement";

const MIN_LEN = 10;
const MAX_LEN = 5000;
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const WEBHOOK_TIMEOUT_MS = 120_000;
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

function resolveWebhookUrl(
  raw: string,
): { ok: true; url: string } | { ok: false; reason: "invalid_url" } {
  const s = raw.trim();
  if (!s) {
    return { ok: false, reason: "invalid_url" };
  }
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, reason: "invalid_url" };
    }
    return { ok: true, url: u.href };
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
}

function buildCallbackUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/api/summarize/callback`;
}

function buildWebhookAuthHeader(): { name: string; value: string } | null {
  const name =
    process.env.SUMMARIZE_WEBHOOK_AUTH_HEADER_NAME?.trim() ?? "";
  const value =
    process.env.SUMMARIZE_WEBHOOK_AUTH_HEADER_VALUE?.trim() ?? "";
  if (!name || !value) return null;
  return { name, value };
}

async function sendToWebhook(
  url: string,
  payload: { text: string; correlationId: string; callbackUrl: string },
): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
  };
  const authHeader = buildWebhookAuthHeader();
  if (authHeader) {
    headers[authHeader.name] = authHeader.value;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      text: payload.text,
      correlationId: payload.correlationId,
      callbackUrl: payload.callbackUrl,
    }),
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  });
  if (!res.ok) {
    const snippet = await res.text().catch(() => "");
    throw new Error(`Webhook HTTP ${res.status}: ${snippet.slice(0, 200)}`);
  }

  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

type SummarizeBody = {
  text?: unknown;
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

function isAnalyzerResult(r: Record<string, unknown>): boolean {
  return (
    typeof r.meaning === "string" &&
    r.meaning.trim().length > 0 &&
    typeof r.urgency === "string" &&
    r.urgency.trim().length > 0 &&
    typeof r.action === "string" &&
    r.action.trim().length > 0 &&
    typeof r.suspicious === "string" &&
    r.suspicious.trim().length > 0
  );
}

function mapAnalyzerToSummarize(r: Record<string, unknown>): SummarizeResult {
  return {
    topic: String(r.meaning).trim(),
    urgency: String(r.urgency).trim(),
    actions: String(r.action).trim(),
    recommendations: String(r.suspicious).trim(),
  };
}

function extractPlainText(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim().length > 20) return raw.trim();
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.output === "string" && obj.output.trim().length > 20)
      return obj.output.trim();
    if (typeof obj.text === "string" && obj.text.trim().length > 20)
      return obj.text.trim();
    if (typeof obj.response === "string" && obj.response.trim().length > 20)
      return obj.response.trim();
    if (typeof obj.result === "string" && obj.result.trim().length > 20)
      return obj.result.trim();
    if (typeof obj.message === "string" && obj.message.trim().length > 20)
      return obj.message.trim();
  }
  return null;
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
            // not JSON-like enough; ignore
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

    if (isAnalyzerResult(obj)) {
      return mapAnalyzerToSummarize(obj);
    }

    queue.push(
      obj.output,
      obj.result,
      obj.data,
      obj.json,
      obj.body,
      obj.response,
    );
    for (const value of Object.values(obj)) queue.push(value);
  }

  const plainText = extractPlainText(raw);
  if (plainText) {
    return {
      topic: "סיכום הודעה",
      urgency: "—",
      actions: plainText,
      recommendations: "—",
    };
  }

  return null;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const entitled = await userHasActiveSubscription(user.id);
  if (!entitled) {
    return NextResponse.json(
      {
        error: "subscription_required",
        message: "כדי לקבל סיכום צריך מנוי פעיל. אפשר להפעיל במסך המנוי.",
      },
      { status: 402 },
    );
  }

  const webhookUrlRaw = process.env.SUMMARIZE_WEBHOOK_URL?.trim() ?? "";
  const webhookResolved = webhookUrlRaw
    ? resolveWebhookUrl(webhookUrlRaw)
    : null;
  const webhookUrl = webhookResolved?.ok ? webhookResolved.url : null;
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  if (!webhookUrl && !hasOpenAI) {
    if (webhookUrlRaw && webhookResolved && !webhookResolved.ok) {
      console.error("SUMMARIZE_WEBHOOK_URL is not a valid http(s) URL");
      return NextResponse.json(
        {
          error: "webhook_config",
          ...withEventCode(101),
        },
        { status: 500 },
      );
    }
    console.error("Set SUMMARIZE_WEBHOOK_URL and/or OPENAI_API_KEY");
    return NextResponse.json(
      {
        error: "server_config",
        ...withEventCode(102),
      },
      { status: 500 },
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
      ? String((body as SummarizeBody).text ?? "")
      : "";

  const trimmed = text.trim();

  if (!trimmed) {
    return NextResponse.json(
      {
        error: "empty",
        message: "יש להדביק טקסט לפני הסיכום",
      },
      { status: 400 },
    );
  }
  if (trimmed.length < MIN_LEN) {
    return NextResponse.json(
      {
        error: "too_short",
        message: "הטקסט קצר מדי לסיכום",
      },
      { status: 400 },
    );
  }
  if (trimmed.length > MAX_LEN) {
    return NextResponse.json(
      {
        error: "too_long",
        message:
          "הטקסט ארוך מדי. נסו לקצר או להדביק את החלק העיקרי",
      },
      { status: 400 },
    );
  }

  const correlationId = randomUUID();

  if (webhookUrl) {
    const callbackUrl =
      process.env.CALLBACK_BASE_URL
        ? `${process.env.CALLBACK_BASE_URL.replace(/\/+$/, "")}/api/summarize/callback`
        : buildCallbackUrl(request);

    markSummarizePending(correlationId);

    let webhookResponse: unknown = null;
    try {
      webhookResponse = await sendToWebhook(webhookUrl, {
        text: trimmed,
        correlationId,
        callbackUrl,
      });
    } catch (err: unknown) {
      console.error("Summarize webhook error:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      let errorCode = 201;
      const isTimeoutError =
        errMsg.includes("timed out") ||
        errMsg.includes("TimeoutError") ||
        errMsg.includes("abort");
      if (isTimeoutError) {
        return NextResponse.json(
          {
            accepted: true,
            correlationId,
          },
          { status: 202 },
        );
      }
      if (errMsg.includes("HTTP 401") || errMsg.includes("HTTP 403"))
        errorCode = 202;
      else if (errMsg.includes("HTTP 404")) errorCode = 205;
      else if (errMsg.includes("ENOTFOUND") || errMsg.includes("ECONNREFUSED"))
        errorCode = 204;
      return NextResponse.json(
        { error: "delivery_failed", ...withEventCode(errorCode) },
        { status: 502 },
      );
    }

    const inlineResult = extractSummarizeResult(webhookResponse);
    if (inlineResult) {
      completeSummarize(correlationId, inlineResult);
      return NextResponse.json(inlineResult);
    }

    if (!hasOpenAI) {
      return NextResponse.json(
        {
          error: "webhook_unrecognized_response",
          ...withEventCode(207),
        },
        { status: 502 },
      );
    }
  }

  if (!hasOpenAI) {
    return NextResponse.json(
      {
        accepted: true,
        correlationId,
      },
      { status: 202 },
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SUMMARIZE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `סכם את ההודעה הבאה:\n\n${trimmed}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "ai_empty", ...withEventCode(301) },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "ai_parse", ...withEventCode(302) },
        { status: 502 },
      );
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed) ||
      !isSummarizeResult(parsed as Record<string, unknown>)
    ) {
      return NextResponse.json(
        { error: "ai_shape", ...withEventCode(303) },
        { status: 502 },
      );
    }

    const result = {
      topic: (parsed as { topic: string }).topic.trim(),
      urgency: (parsed as { urgency: string }).urgency.trim(),
      actions: (parsed as { actions: string }).actions.trim(),
      recommendations: (parsed as { recommendations: string }).recommendations.trim(),
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("OpenAI summarize error:", err);
    return NextResponse.json(
      { error: "upstream", ...withEventCode(304) },
      { status: 502 },
    );
  }
}
