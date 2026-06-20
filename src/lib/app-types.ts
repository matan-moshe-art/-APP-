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
  if (feature !== "scam") return false;
  return (
    "meaning" in result &&
    "action" in result &&
    "suspicious" in result &&
    typeof result.meaning === "string" &&
    typeof result.urgency === "string" &&
    typeof result.action === "string" &&
    typeof result.suspicious === "string"
  );
}

export function isSummarizeResult(
  feature: SelectedFeature,
  result: AppResult,
): result is SummarizeResult {
  if (feature !== "summarizer") return false;
  return (
    "topic" in result &&
    "actions" in result &&
    "recommendations" in result &&
    typeof result.topic === "string" &&
    typeof result.urgency === "string" &&
    typeof result.actions === "string" &&
    typeof result.recommendations === "string"
  );
}

export function inputModeFromSelection(
  inputType: SelectedInputType | null,
): InputMode | null {
  if (!inputType) return null;
  if (inputType === "short") return "short";
  return "long";
}
