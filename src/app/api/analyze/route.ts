import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ANALYZE_SYSTEM_PROMPT } from "@/lib/analyze-prompt";
import { getPrisma } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/billing/auth";
import { userHasActiveSubscription } from "@/lib/billing/entitlement";
import { triggerAndWaitForResult } from "@/lib/cursor-webhook-auth";

const MIN_LEN = 10;
const MAX_LEN = 5000;
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const ANALYZE_WEBHOOK_URL =
  process.env.ANALYZE_WEBHOOK_URL?.trim() ??
  "https://api2.cursor.sh/automations/webhook/b792b886-1381-47fc-94d6-23f4f66e7d4b";
const ANALYZE_WEBHOOK_AUTH_TOKEN =
  process.env.ANALYZE_WEBHOOK_AUTH_TOKEN?.trim() ?? "";
const USER_ERROR_PREFIX =
  "לא הצלחנו להשלים את הבקשה כרגע. נסו שוב בעוד רגע.";

function withEventCode(code: number): {
  eventCode: string;
  message: string;
} {
  const eventCode = `AN-${code}`;
  return {
    eventCode,
    message: `${USER_ERROR_PREFIX} קוד אירוע: ${eventCode}`,
  };
}

type AnalysisResult = {
  meaning: string;
  urgency: string;
  action: string;
  suspicious: string;
};

function isAnalyzeResult(r: Record<string, unknown>): r is AnalysisResult {
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

function extractAnalysisResult(raw: unknown): AnalysisResult | null {
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

    if (isAnalyzeResult(obj)) {
      return {
        meaning: obj.meaning.trim(),
        urgency: obj.urgency.trim(),
        action: obj.action.trim(),
        suspicious: obj.suspicious.trim(),
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
        message: "כדי לקבל ניתוח צריך מנוי פעיל. אפשר להפעיל במסך המנוי.",
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
      { error: "empty", message: "יש להדביק הודעה לפני הניתוח" },
      { status: 400 },
    );
  }
  if (trimmed.length < MIN_LEN) {
    return NextResponse.json(
      { error: "too_short", message: "ההודעה קצרה מדי לניתוח" },
      { status: 400 },
    );
  }
  if (trimmed.length > MAX_LEN) {
    return NextResponse.json(
      { error: "too_long", message: "ההודעה ארוכה מדי. נסו לקצר או להדביק את החלק העיקרי" },
      { status: 400 },
    );
  }

  // --- Try Cursor automation webhook first ---
  if (ANALYZE_WEBHOOK_URL && ANALYZE_WEBHOOK_AUTH_TOKEN) {
    const outcome = await triggerAndWaitForResult({
      webhookUrl: ANALYZE_WEBHOOK_URL,
      authToken: ANALYZE_WEBHOOK_AUTH_TOKEN,
      payload: {
        text: trimmed,
        prompt: ANALYZE_SYSTEM_PROMPT,
        message: trimmed,
      },
    });

    if (outcome.ok) {
      const result = extractAnalysisResult(outcome.resultText);
      if (result) {
        const prisma = getPrisma();
        if (prisma) {
          try {
            await prisma.analysis.create({
              data: {
                inputText: trimmed,
                resultMeaning: result.meaning,
                resultUrgency: result.urgency,
                resultAction: result.action,
                resultSuspicious: result.suspicious,
                modelUsed: "cursor-automation",
                durationMs: 0,
              },
            });
          } catch (dbErr) {
            console.error("Failed to save analysis:", dbErr);
          }
        }
        return NextResponse.json(result);
      }
      console.error("Could not extract analysis from agent output:", outcome.resultText.slice(0, 500));
    } else {
      console.error(`Analyze webhook failed [${outcome.errorCode}]: ${outcome.detail}`);
    }

    // Fall through to OpenAI if webhook result was unusable
    if (!process.env.OPENAI_API_KEY) {
      const code = outcome.ok ? 207 : outcome.errorCode;
      return NextResponse.json(
        { error: "webhook_error", ...withEventCode(code) },
        { status: 502 },
      );
    }
  }

  // --- Fallback: direct OpenAI ---
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "server_config", ...withEventCode(102) },
      { status: 500 },
    );
  }

  const started = Date.now();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: ANALYZE_SYSTEM_PROMPT },
        { role: "user", content: `נתח את ההודעה הבאה:\n\n${trimmed}` },
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
      !isAnalyzeResult(parsed as Record<string, unknown>)
    ) {
      return NextResponse.json(
        { error: "ai_shape", ...withEventCode(303) },
        { status: 502 },
      );
    }

    const result = {
      meaning: (parsed as AnalysisResult).meaning.trim(),
      urgency: (parsed as AnalysisResult).urgency.trim(),
      action: (parsed as AnalysisResult).action.trim(),
      suspicious: (parsed as AnalysisResult).suspicious.trim(),
    };

    const durationMs = Date.now() - started;

    const prisma = getPrisma();
    if (prisma) {
      try {
        await prisma.analysis.create({
          data: {
            inputText: trimmed,
            resultMeaning: result.meaning,
            resultUrgency: result.urgency,
            resultAction: result.action,
            resultSuspicious: result.suspicious,
            modelUsed: MODEL,
            durationMs,
          },
        });
      } catch (dbErr) {
        console.error("Failed to save analysis:", dbErr);
      }
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("OpenAI error:", err);
    return NextResponse.json(
      { error: "upstream", ...withEventCode(304) },
      { status: 502 },
    );
  }
}
