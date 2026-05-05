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

function parsePossibleJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function extractCorrelationId(raw: unknown): string {
  const queue: unknown[] = [raw];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (typeof current === "string") {
      const parsed = parsePossibleJson(current);
      if (parsed) queue.push(parsed);
      continue;
    }

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    if (typeof current !== "object") continue;
    const obj = current as Record<string, unknown>;

    const direct =
      typeof obj.correlationId === "string"
        ? obj.correlationId.trim()
        : typeof obj.correlationID === "string"
          ? obj.correlationID.trim()
          : typeof obj.correlation_id === "string"
            ? obj.correlation_id.trim()
            : "";
    if (direct) return direct;

    queue.push(obj.body, obj.result, obj.data, obj.json, obj.query, obj.payload);
    for (const value of Object.values(obj)) queue.push(value);
  }

  return "";
}

function extractResult(raw: unknown): AnalysisResult | null {
  const queue: unknown[] = [raw];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (typeof current === "string") {
      const parsed = parsePossibleJson(current);
      if (parsed) queue.push(parsed);
      continue;
    }

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    if (typeof current !== "object") continue;
    const obj = current as Record<string, unknown>;
    if (isValidResult(obj)) {
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

  const correlationId = extractCorrelationId(body);

  if (!correlationId) {
    return NextResponse.json(
      { error: "missing_correlation_id" },
      { status: 400 },
    );
  }

  const result: AnalysisResult | null = extractResult(body);

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
