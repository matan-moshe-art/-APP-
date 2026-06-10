import type { ScamResult } from "@/lib/app-types";
import { ResultBlock } from "@/components/ResultBlock";

type ScamResultViewProps = {
  result: ScamResult;
  onReset: () => void;
};

export function ScamResultView({ result, onReset }: ScamResultViewProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">תוצאות הבדיקה</h2>
      <ResultBlock title="מה זה אומר" body={result.meaning} />
      <ResultBlock title="רמת דחיפות" body={result.urgency} />
      <ResultBlock title="מה לעשות עכשיו" body={result.action} />
      <ResultBlock title="סימנים חשודים" body={result.suspicious} />
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
