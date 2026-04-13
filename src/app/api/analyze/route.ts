import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ANALYZE_SYSTEM_PROMPT } from "@/lib/analyze-prompt";
import { getPrisma } from "@/lib/db";

const MIN_LEN = 10;
const MAX_LEN = 5000;
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const MAKE_TIMEOUT_MS = 25_000;

async function postToMakeWebhook(
  url: string,
  payload: { text: string; correlationId: string },
): Promise<void> {
  const body = {
    text: payload.text,
    Text: payload.text,
    body: payload.text,
    message: payload.text,
    correlationId: payload.correlationId,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(MAKE_TIMEOUT_MS),
  });
  if (!res.ok) {
    const snippet = await res.text().catch(() => "");
    throw new Error(
      `Make webhook HTTP ${res.status}: ${snippet.slice(0, 200)}`,
    );
  }
}

type AnalyzeBody = {
  text?: unknown;
};

function isAnalyzeResult(r: Record<string, unknown>): r is {
  meaning: string;
  urgency: string;
  action: string;
  suspicious: string;
} {
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

export async function POST(request: Request) {
  const makeUrl = process.env.MAKE_WEBHOOK_URL?.trim();
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  if (!makeUrl && !hasOpenAI) {
    console.error("Set MAKE_WEBHOOK_URL and/or OPENAI_API_KEY");
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const text =
    typeof body === "object" && body !== null && "text" in body
      ? String((body as AnalyzeBody).text ?? "")
      : "";

  const trimmed = text.trim();

  if (!trimmed) {
    return NextResponse.json(
      {
        error: "empty",
        message: "יש להדביק הודעה לפני הניתוח",
      },
      { status: 400 },
    );
  }
  if (trimmed.length < MIN_LEN) {
    return NextResponse.json(
      {
        error: "too_short",
        message: "ההודעה קצרה מדי לניתוח",
      },
      { status: 400 },
    );
  }
  if (trimmed.length > MAX_LEN) {
    return NextResponse.json(
      {
        error: "too_long",
        message:
          "ההודעה ארוכה מדי. נסו לקצר או להדביק את החלק העיקרי",
      },
      { status: 400 },
    );
  }

  const correlationId = randomUUID();

  if (makeUrl) {
    try {
      await postToMakeWebhook(makeUrl, { text: trimmed, correlationId });
    } catch (err: unknown) {
      console.error("Make webhook error:", err);
      return NextResponse.json(
        { error: "make_webhook", message: "שליחה ל-Make נכשלה. נסו שוב." },
        { status: 502 },
      );
    }
  }

  if (!hasOpenAI) {
    return NextResponse.json(
      {
        accepted: true,
        correlationId,
        message:
          "הבקשה נשלחה לעיבוד. התוצאה תגיע כשהתרחיש ב-Make יסיים (למשל ב-webhook חוזר).",
      },
      { status: 202 },
    );
  }

  const started = Date.now();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: ANALYZE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `נתח את ההודעה הבאה:\n\n${trimmed}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "ai_empty" }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "ai_parse" }, { status: 502 });
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed) ||
      !isAnalyzeResult(parsed as Record<string, unknown>)
    ) {
      return NextResponse.json({ error: "ai_shape" }, { status: 502 });
    }

    const result = {
      meaning: (parsed as { meaning: string }).meaning.trim(),
      urgency: (parsed as { urgency: string }).urgency.trim(),
      action: (parsed as { action: string }).action.trim(),
      suspicious: (parsed as { suspicious: string }).suspicious.trim(),
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
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
