import type { ScamResult, SummarizeResult } from "@/lib/app-types";

export function isScamPayload(data: unknown): data is ScamResult {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
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

export function isSummarizePayload(data: unknown): data is SummarizeResult {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.topic === "string" &&
    o.topic.trim().length > 0 &&
    typeof o.urgency === "string" &&
    o.urgency.trim().length > 0 &&
    typeof o.actions === "string" &&
    o.actions.trim().length > 0 &&
    typeof o.recommendations === "string" &&
    o.recommendations.trim().length > 0
  );
}

export function normalizeScamResult(result: ScamResult): ScamResult {
  return {
    meaning: result.meaning.trim(),
    urgency: result.urgency.trim(),
    action: result.action.trim(),
    suspicious: result.suspicious.trim(),
  };
}

export function normalizeSummarizeResult(result: SummarizeResult): SummarizeResult {
  return {
    topic: result.topic.trim(),
    urgency: result.urgency.trim(),
    actions: result.actions.trim(),
    recommendations: result.recommendations.trim(),
  };
}
