export type SelectedFeature = "summarizer" | "scam";

export type SelectedInputType = "short" | "long" | "pdf";

/** API / prompt routing: PDF is analyzed as long-form. */
export type InputMode = "short" | "long";

export type ScamResult = {
  meaning: string;
  urgency: string;
  action: string;
  suspicious: string;
};

export type SummarizeResult = {
  topic: string;
  urgency: string;
  actions: string;
  recommendations: string;
};

export type AppResult = ScamResult | SummarizeResult;

export function isScamResult(
  feature: SelectedFeature,
  result: AppResult,
): result is ScamResult {
  return feature === "scam" && "meaning" in result;
}

export function isSummarizeResult(
  feature: SelectedFeature,
  result: AppResult,
): result is SummarizeResult {
  return feature === "summarizer" && "topic" in result;
}

export function inputModeFromSelection(
  inputType: SelectedInputType | null,
): InputMode | null {
  if (!inputType) return null;
  if (inputType === "short") return "short";
  return "long";
}
