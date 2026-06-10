import type { SummarizeResult } from "@/lib/app-types";
import { ResultBlock } from "@/components/ResultBlock";

type SummarizeResultViewProps = {
  result: SummarizeResult;
  onReset: () => void;
};

export function SummarizeResultView({
  result,
  onReset,
}: SummarizeResultViewProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">הסיכום</h2>
      <ResultBlock title="נושא עיקרי" body={result.topic} />
      <ResultBlock title="רמת דחיפות" body={result.urgency} />
      <ResultBlock title="פעולות חשובות" body={result.actions} />
      <ResultBlock title="המלצה" body={result.recommendations} />
      <button
        type="button"
        onClick={onReset}
        className="btn-ghost mt-2 w-full rounded-lg border border-zinc-600 px-4 py-3 text-sm font-medium text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 sm:w-auto"
      >
        התחילו ניתוח חדש
      </button>
    </div>
  );
}
