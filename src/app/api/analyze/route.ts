import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  extractStructuredResult,
  validateAiRequest,
  withEventCode,
} from "@/lib/ai-route-helpers";
import {
  markInteractionFailure,
  markInteractionSuccess,
} from "@/lib/ai-interactions-repo";
import { triggerAndWaitForResult } from "@/lib/cursor-webhook-auth";
import {
  isWebhookConfigured,
  resolveCursorWebhook,
} from "@/lib/cursor-webhook-routing";
import type { ScamResult } from "@/lib/app-types";
import { isScamPayload, normalizeScamResult } from "@/lib/result-validators";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

function extractAnalysisResult(raw: unknown): ScamResult | null {
  return extractStructuredResult(raw, isScamPayload, normalizeScamResult);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const validated = await validateAiRequest({
    body,
    feature: "analyze",
    selectedFeature: "scam",
    emptyMessage: "הוסיפו הודעה או PDF לפני ההתחלה.",
    shortMessage: "ההודעה קצרה מדי לניתוח",
    longMessage: "ההודעה ארוכה מדי. נסו לקצר או להדביק את החלק העיקרי",
  });

  if (!validated.ok) return validated.response;

  const { trimmed, inputMode, systemPrompt, logId } = validated;
  const webhook = resolveCursorWebhook("analyze", inputMode);

  // --- Try Cursor automation webhook first ---
  if (isWebhookConfigured(webhook)) {
    const outcome = await triggerAndWaitForResult({
      webhookUrl: webhook.url,
      authToken: webhook.authToken,
      payload: { text: trimmed, prompt: systemPrompt, inputType: inputMode },
      signal: request.signal,
    });

    if (outcome.ok) {
      const result = extractAnalysisResult(outcome.resultText);
      if (result) {
        await markInteractionSuccess(logId, result);
        return NextResponse.json(result);
      }
      console.error(
        "Could not extract analysis from agent output:",
        outcome.resultText.slice(0, 500),
      );
    } else {
      console.error(`Analyze webhook failed [${outcome.errorCode}]: ${outcome.detail}`);
    }

    // Fall through to OpenAI if webhook result was unusable
    if (!process.env.OPENAI_API_KEY) {
      const code = outcome.ok ? 207 : outcome.errorCode;
      const { eventCode } = withEventCode("AN", code);
      await markInteractionFailure(logId, eventCode);
      return NextResponse.json(
        { error: "webhook_error", ...withEventCode("AN", code) },
        { status: 502 },
      );
    }
  }

  // --- Fallback: direct OpenAI ---
  if (!process.env.OPENAI_API_KEY) {
    const { eventCode } = withEventCode("AN", 102);
    await markInteractionFailure(logId, eventCode);
    return NextResponse.json(
      { error: "server_config", ...withEventCode("AN", 102) },
      { status: 500 },
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `נתח את ההודעה הבאה:\n\n${trimmed}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      const { eventCode } = withEventCode("AN", 301);
      await markInteractionFailure(logId, eventCode);
      return NextResponse.json(
        { error: "ai_empty", ...withEventCode("AN", 301) },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const { eventCode } = withEventCode("AN", 302);
      await markInteractionFailure(logId, eventCode);
      return NextResponse.json(
        { error: "ai_parse", ...withEventCode("AN", 302) },
        { status: 502 },
      );
    }

    if (!isScamPayload(parsed)) {
      const { eventCode } = withEventCode("AN", 303);
      await markInteractionFailure(logId, eventCode);
      return NextResponse.json(
        { error: "ai_shape", ...withEventCode("AN", 303) },
        { status: 502 },
      );
    }

    const result = normalizeScamResult(parsed);
    await markInteractionSuccess(logId, result);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("OpenAI error:", err);
    const { eventCode } = withEventCode("AN", 304);
    await markInteractionFailure(logId, eventCode);
    return NextResponse.json(
      { error: "upstream", ...withEventCode("AN", 304) },
      { status: 502 },
    );
  }
}
