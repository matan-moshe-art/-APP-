import { NextResponse } from "next/server";
import { completeAnalysis, type AnalysisResult } from "@/lib/pending-store";

const CALLBACK_SECRET = process.env.CALLBACK_SECRET ?? "";

function isValidResult(v: unknown): v is AnalysisResult {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.meaning === "string" &&
    o.meaning.trim().length > 0 &&
    typeof o.urgency === "string" &&
    o.urgency.trim().length > 0 &&
    typeof o.action === "string" &&
    o.action.trim().length > 0 &&
    typeof o.suspicious === "string" &&
    o.suspicious.trim().length > 0
  );
}

export async function POST(request: Request) {
  if (CALLBACK_SECRET) {
    const auth = request.headers.get("x-callback-secret") ?? "";
    if (auth !== CALLBACK_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;
  const correlationId =
    typeof obj.correlationId === "string" ? obj.correlationId.trim() : "";

  if (!correlationId) {
    return NextResponse.json(
      { error: "missing_correlation_id" },
      { status: 400 },
    );
  }

  const result: AnalysisResult | null = isValidResult(obj)
    ? {
        meaning: (obj as AnalysisResult).meaning.trim(),
        urgency: (obj as AnalysisResult).urgency.trim(),
        action: (obj as AnalysisResult).action.trim(),
        suspicious: (obj as AnalysisResult).suspicious.trim(),
      }
    : isValidResult(obj.result)
      ? {
          meaning: (obj.result as AnalysisResult).meaning.trim(),
          urgency: (obj.result as AnalysisResult).urgency.trim(),
          action: (obj.result as AnalysisResult).action.trim(),
          suspicious: (obj.result as AnalysisResult).suspicious.trim(),
        }
      : null;

  if (!result) {
    return NextResponse.json(
      {
        error: "invalid_result",
        expected: "{ correlationId, meaning, urgency, action, suspicious }",
      },
      { status: 400 },
    );
  }

  const found = completeAnalysis(correlationId, result);
  if (!found) {
    return NextResponse.json(
      { error: "unknown_or_expired", correlationId },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, correlationId });
}
