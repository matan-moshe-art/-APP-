import { ANALYZE_LONG_SYSTEM_PROMPT } from "@/lib/analyze-prompt-long";
import { ANALYZE_SHORT_SYSTEM_PROMPT } from "@/lib/analyze-prompt-short";
import type { InputMode, SelectedFeature } from "@/lib/app-types";
import { SUMMARIZE_LONG_SYSTEM_PROMPT } from "@/lib/summarize-prompt-long";
import { SUMMARIZE_SHORT_SYSTEM_PROMPT } from "@/lib/summarize-prompt-short";

export function resolveSystemPrompt(
  feature: SelectedFeature,
  mode: InputMode,
): string {
  if (feature === "scam") {
    return mode === "short"
      ? ANALYZE_SHORT_SYSTEM_PROMPT
      : ANALYZE_LONG_SYSTEM_PROMPT;
  }
  return mode === "short"
    ? SUMMARIZE_SHORT_SYSTEM_PROMPT
    : SUMMARIZE_LONG_SYSTEM_PROMPT;
}

export const TEXT_LIMITS = {
  short: { min: 10, max: 2_500 },
  long: { min: 10, max: 80_000 },
} as const;

export function limitsForMode(mode: InputMode) {
  return TEXT_LIMITS[mode];
}
