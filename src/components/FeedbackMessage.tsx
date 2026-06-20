type FeedbackMessageProps = {
  message: string;
  eventCode?: string | null;
  variant: "validation" | "error";
  onRetry?: () => void;
};

export function FeedbackMessage({
  message,
  eventCode,
  variant,
  onRetry,
}: FeedbackMessageProps) {
  const isError = variant === "error";

  return (
    <div
      className={
        isError
          ? "rounded-xl border border-zinc-700 bg-zinc-900/60 p-4"
          : undefined
      }
      role="alert"
    >
      <p
        className={
          isError ? "text-sm text-zinc-300" : "text-sm text-amber-200/90"
        }
      >
        {message}
      </p>
      {eventCode ? (
        <p className="mt-1 font-mono text-xs text-zinc-500">{eventCode}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="btn-ghost mt-4 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          נסו שנית
        </button>
      ) : null}
    </div>
  );
}
