import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ANALYZE_SYSTEM_PROMPT } from "@/lib/analyze-prompt";
import { getPrisma } from "@/lib/db";
import {
  markPending,
  completeAnalysis,
  type AnalysisResult,
} from "@/lib/pending-store";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { userHasActiveSubscription } from "@/lib/billing/entitlement";

const MIN_LEN = 10;
const MAX_LEN = 5000;
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const WEBHOOK_TIMEOUT_MS = 25_000;

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
  return `${url.origin}/api/analyze/callback`;
}

function buildWebhookAuthHeader(): { name: string; value: string } | null {
  const name = process.env.ANALYZE_WEBHOOK_AUTH_HEADER_NAME?.trim() ?? "";
  const value = process.env.ANALYZE_WEBHOOK_AUTH_HEADER_VALUE?.trim() ?? "";
  if (!name || !value) return null;
  return { name, value };
}

async function sendToWebhook(
  url: string,
  payload: { text: string; correlationId: string; callbackUrl: string },
): Promise<unknown> {
  // Mirror the payload onto query params so workflows that read either
  // `$json.body.*` or `$json.query.*` keep working without changes.
  const webhookUrl = new URL(url);
  webhookUrl.searchParams.set("text", payload.text);
  webhookUrl.searchParams.set("Text", payload.text);
  webhookUrl.searchParams.set("body", payload.text);
  webhookUrl.searchParams.set("message", payload.text);
  webhookUrl.searchParams.set("correlationId", payload.correlationId);
  webhookUrl.searchParams.set("callbackUrl", payload.callbackUrl);

  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
  };
  const authHeader = buildWebhookAuthHeader();
  if (authHeader) {
    headers[authHeader.name] = authHeader.value;
  }

  // #region agent log
  fetch('http://127.0.0.1:7549/ingest/e6a5982d-3e05-40a8-8ae0-f15bee2ba81f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0d8004'},body:JSON.stringify({sessionId:'0d8004',location:'route.ts:sendToWebhook',message:'Calling n8n webhook',data:{finalUrl:webhookUrl.toString().slice(0,120),hasHeaderAuth:!!authHeader,authHeaderName:authHeader?.name},timestamp:Date.now(),hypothesisId:'H1,H2,H4'})}).catch(()=>{});
  // #endregion
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      text: payload.text,
      Text: payload.text,
      body: payload.text,
      message: payload.text,
      correlationId: payload.correlationId,
      callbackUrl: payload.callbackUrl,
    }),
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  });
  if (!res.ok) {
    const snippet = await res.text().catch(() => "");
    // #region agent log
    fetch('http://127.0.0.1:7549/ingest/e6a5982d-3e05-40a8-8ae0-f15bee2ba81f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0d8004'},body:JSON.stringify({sessionId:'0d8004',location:'route.ts:sendToWebhook',message:'Webhook NOT OK',data:{status:res.status,statusText:res.statusText,snippet:snippet.slice(0,300)},timestamp:Date.now(),hypothesisId:'H1,H2,H3,H4'})}).catch(()=>{});
    // #endregion
    throw new Error(`Webhook HTTP ${res.status}: ${snippet.slice(0, 200)}`);
  }

  const text = await res.text().catch(() => "");
  // #region agent log
  fetch('http://127.0.0.1:7549/ingest/e6a5982d-3e05-40a8-8ae0-f15bee2ba81f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0d8004'},body:JSON.stringify({sessionId:'0d8004',location:'route.ts:sendToWebhook',message:'Webhook OK response',data:{status:res.status,bodyLen:text.length,bodyPreview:text.slice(0,300)},timestamp:Date.now(),hypothesisId:'H1,H4'})}).catch(()=>{});
  // #endregion
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
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

/**
 * n8n may return the result in various shapes: as a flat object with the
 * four fields, nested under an `output` key (AI Agent node), or wrapped
 * inside a stringified JSON value. Try all common shapes.
 */
function extractAnalysisResult(raw: unknown): AnalysisResult | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;

  if (isAnalyzeResult(obj)) {
    return {
      meaning: obj.meaning.trim(),
      urgency: obj.urgency.trim(),
      action: obj.action.trim(),
      suspicious: obj.suspicious.trim(),
    };
  }

  // n8n AI Agent wraps output in an `output` key (string with JSON inside)
  const nested = obj.output ?? obj.result ?? obj.data;
  if (typeof nested === "string") {
    try {
      const parsed = JSON.parse(nested);
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        isAnalyzeResult(parsed as Record<string, unknown>)
      ) {
        return {
          meaning: (parsed as AnalysisResult).meaning.trim(),
          urgency: (parsed as AnalysisResult).urgency.trim(),
          action: (parsed as AnalysisResult).action.trim(),
          suspicious: (parsed as AnalysisResult).suspicious.trim(),
        };
      }
    } catch {
      // not valid JSON; ignore
    }
  }

  if (
    nested &&
    typeof nested === "object" &&
    !Array.isArray(nested) &&
    isAnalyzeResult(nested as Record<string, unknown>)
  ) {
    const n = nested as AnalysisResult;
    return {
      meaning: n.meaning.trim(),
      urgency: n.urgency.trim(),
      action: n.action.trim(),
      suspicious: n.suspicious.trim(),
    };
  }

  return null;
}

export async function POST(request: Request) {
  // #region agent log
  fetch('http://127.0.0.1:7549/ingest/e6a5982d-3e05-40a8-8ae0-f15bee2ba81f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0d8004'},body:JSON.stringify({sessionId:'0d8004',location:'route.ts:POST',message:'POST /api/analyze entry',data:{webhookUrl:process.env.ANALYZE_WEBHOOK_URL?.slice(0,80),hasHeaderAuthName:!!process.env.ANALYZE_WEBHOOK_AUTH_HEADER_NAME,hasHeaderAuthValue:!!process.env.ANALYZE_WEBHOOK_AUTH_HEADER_VALUE,headerAuthName:process.env.ANALYZE_WEBHOOK_AUTH_HEADER_NAME?.slice(0,40)},timestamp:Date.now(),hypothesisId:'H1,H2,H3'})}).catch(()=>{});
  // #endregion
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
        message: "כדי לקבל ניתוח צריך מנוי פעיל. אפשר להפעיל במסך המנוי.",
      },
      { status: 402 },
    );
  }

  const webhookUrlRaw = process.env.ANALYZE_WEBHOOK_URL?.trim() ?? "";
  const webhookResolved = webhookUrlRaw
    ? resolveWebhookUrl(webhookUrlRaw)
    : null;
  const webhookUrl = webhookResolved?.ok ? webhookResolved.url : null;
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  if (!webhookUrl && !hasOpenAI) {
    if (webhookUrlRaw && webhookResolved && !webhookResolved.ok) {
      console.error("ANALYZE_WEBHOOK_URL is not a valid http(s) URL");
      return NextResponse.json(
        {
          error: "webhook_config",
          message: "אירעה תקלה בשירות הניתוח. קוד שגיאה: 101",
        },
        { status: 500 },
      );
    }
    console.error("Set ANALYZE_WEBHOOK_URL and/or OPENAI_API_KEY");
    return NextResponse.json(
      {
        error: "server_config",
        message: "שירות הניתוח לא זמין כרגע. קוד שגיאה: 102",
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

  if (webhookUrl) {
    const callbackUrl =
      process.env.CALLBACK_BASE_URL
        ? `${process.env.CALLBACK_BASE_URL.replace(/\/+$/, "")}/api/analyze/callback`
        : buildCallbackUrl(request);

    markPending(correlationId);

    let webhookResponse: unknown = null;
    try {
      webhookResponse = await sendToWebhook(webhookUrl, {
        text: trimmed,
        correlationId,
        callbackUrl,
      });
    } catch (err: unknown) {
      console.error("Webhook error:", err);
      // #region agent log
      fetch('http://127.0.0.1:7549/ingest/e6a5982d-3e05-40a8-8ae0-f15bee2ba81f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0d8004'},body:JSON.stringify({sessionId:'0d8004',location:'route.ts:POST',message:'Webhook delivery failed',data:{error:err instanceof Error?err.message:String(err),name:err instanceof Error?err.name:'unknown'},timestamp:Date.now(),hypothesisId:'H1,H2,H3,H4,H5'})}).catch(()=>{});
      // #endregion
      const errMsg = err instanceof Error ? err.message : String(err);
      let errorCode = 201;
      if (errMsg.includes("HTTP 401") || errMsg.includes("HTTP 403")) errorCode = 202;
      else if (errMsg.includes("HTTP 404")) errorCode = 205;
      else if (errMsg.includes("timed out") || errMsg.includes("TimeoutError") || errMsg.includes("abort")) errorCode = 203;
      else if (errMsg.includes("ENOTFOUND") || errMsg.includes("ECONNREFUSED")) errorCode = 204;
      return NextResponse.json(
        { error: "delivery_failed", message: `אירעה תקלה בעת שליחת הניתוח. קוד שגיאה: ${errorCode}` },
        { status: 502 },
      );
    }

    // n8n's "Respond to Webhook" returns the result inline in the HTTP
    // response. Extract it and store it so the frontend polling picks it up
    // immediately (or even return it directly).
    const inlineResult = extractAnalysisResult(webhookResponse);
    if (inlineResult) {
      completeAnalysis(correlationId, inlineResult);
      return NextResponse.json(inlineResult);
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
      return NextResponse.json(
        { error: "ai_empty", message: "שירות הניתוח לא החזיר תוצאה. קוד שגיאה: 301" },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "ai_parse", message: "תוצאת הניתוח לא תקינה. קוד שגיאה: 302" },
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
        { error: "ai_shape", message: "תוצאת הניתוח לא תקינה. קוד שגיאה: 303" },
        { status: 502 },
      );
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
    return NextResponse.json(
      { error: "upstream", message: "שירות הניתוח נתקל בבעיה. קוד שגיאה: 304" },
      { status: 502 },
    );
  }
}
