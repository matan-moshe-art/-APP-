import { NextResponse } from "next/server";
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
import type { SummarizeResult } from "@/lib/app-types";
import {
  isSummarizePayload,
  normalizeSummarizeResult,
} from "@/lib/result-validators";

function extractSummarizeResult(raw: unknown): SummarizeResult | null {
  return extractStructuredResult(raw, isSummarizePayload, normalizeSummarizeResult);
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
    feature: "summarize",
    selectedFeature: "summarizer",
    emptyMessage: "הוסיפו הודעה או PDF לפני ההתחלה.",
    shortMessage: "הטקסט קצר מדי לסיכום",
    longMessage: "הטקסט ארוך מדי. נסו לקצר או להדביק את החלק העיקרי",
  });

  if (!validated.ok) return validated.response;

  const { trimmed, inputMode, systemPrompt, logId } = validated;
  const webhook = resolveCursorWebhook("summarize", inputMode);

  if (!isWebhookConfigured(webhook)) {
    const { eventCode } = withEventCode("SM", 102);
    await markInteractionFailure(logId, eventCode);
    return NextResponse.json(
      { error: "server_config", ...withEventCode("SM", 102) },
      { status: 500 },
    );
  }

  const outcome = await triggerAndWaitForResult({
    webhookUrl: webhook.url,
    authToken: webhook.authToken,
    payload: { text: trimmed, prompt: systemPrompt, inputType: inputMode },
    signal: request.signal,
  });

  if (!outcome.ok) {
    console.error(`Summarize webhook failed [${outcome.errorCode}]: ${outcome.detail}`);
    const { eventCode } = withEventCode("SM", outcome.errorCode);
    await markInteractionFailure(logId, eventCode);
    return NextResponse.json(
      { error: "webhook_error", ...withEventCode("SM", outcome.errorCode) },
      { status: 502 },
    );
  }

  const parsed = extractSummarizeResult(outcome.resultText);
  if (parsed) {
    await markInteractionSuccess(logId, parsed);
    return NextResponse.json(parsed);
  }

  console.error(
    "Could not extract summarize result from agent output:",
    outcome.resultText.slice(0, 500),
  );
  const { eventCode } = withEventCode("SM", 207);
  await markInteractionFailure(logId, eventCode);
  return NextResponse.json(
    { error: "webhook_unrecognized_response", ...withEventCode("SM", 207) },
    { status: 502 },
  );
}
