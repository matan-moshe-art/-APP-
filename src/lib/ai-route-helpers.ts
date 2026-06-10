import type { InputMode } from "@/lib/app-types";
import {
  createInteractionLog,
  type InteractionFeature,
} from "@/lib/ai-interactions-repo";
import { limitsForMode, resolveSystemPrompt } from "@/lib/prompt-routing";
import type { SelectedFeature } from "@/lib/app-types";
import { NextResponse } from "next/server";

const USER_ERROR_PREFIX =
  "לא הצלחנו להשלים את הבקשה כרגע. נסו שוב בעוד רגע.";

export function parseInputMode(body: unknown): InputMode {
  if (
    typeof body === "object" &&
    body !== null &&
    "inputType" in body &&
    (body as { inputType?: unknown }).inputType === "short"
  ) {
    return "short";
  }
  return "long";
}

export function withEventCode(
  prefix: "AN" | "SM",
  code: number,
): { eventCode: string; message: string } {
  const eventCode = `${prefix}-${code}`;
  return {
    eventCode,
    message: `${USER_ERROR_PREFIX} קוד אירוע: ${eventCode}`,
  };
}

/** Extract the first balanced `{...}` JSON object from a string. */
export function extractJsonObjectFromString(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

export function extractStructuredResult<T extends Record<string, string>>(
  raw: unknown,
  isValid: (r: Record<string, unknown>) => r is T,
  normalize: (r: T) => T,
): T | null {
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
        const jsonSlice = extractJsonObjectFromString(current);
        if (jsonSlice) {
          try {
            queue.push(JSON.parse(jsonSlice));
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

    if (isValid(obj)) {
      return normalize(obj);
    }

    queue.push(obj.output, obj.result, obj.data, obj.json, obj.body, obj.response);
    for (const value of Object.values(obj)) queue.push(value);
  }

  return null;
}

export type ValidatedAiRequest =
  | {
      ok: true;
      trimmed: string;
      inputMode: InputMode;
      systemPrompt: string;
      logId: string | null;
    }
  | { ok: false; response: NextResponse };

export async function validateAiRequest(opts: {
  body: unknown;
  feature: InteractionFeature;
  selectedFeature: SelectedFeature;
  emptyMessage: string;
  shortMessage: string;
  longMessage: string;
}): Promise<ValidatedAiRequest> {
  const text =
    typeof opts.body === "object" && opts.body !== null && "text" in opts.body
      ? String((opts.body as { text?: unknown }).text ?? "")
      : "";

  const trimmed = text.trim();
  const inputMode = parseInputMode(opts.body);
  const { min, max } = limitsForMode(inputMode);
  const systemPrompt = resolveSystemPrompt(opts.selectedFeature, inputMode);

  if (!trimmed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "empty", message: opts.emptyMessage },
        { status: 400 },
      ),
    };
  }
  if (trimmed.length < min) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "too_short", message: opts.shortMessage },
        { status: 400 },
      ),
    };
  }
  if (trimmed.length > max) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "too_long", message: opts.longMessage },
        { status: 400 },
      ),
    };
  }

  const logId = await createInteractionLog({
    feature: opts.feature,
    inputMode,
    userMessage: trimmed,
  });

  return {
    ok: true,
    trimmed,
    inputMode,
    systemPrompt,
    logId,
  };
}
