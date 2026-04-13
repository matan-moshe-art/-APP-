export type AnalysisResult = {
  meaning: string;
  urgency: string;
  action: string;
  suspicious: string;
};

type PendingEntry = {
  status: "pending" | "completed";
  result: AnalysisResult | null;
  createdAt: number;
};

const ENTRY_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000;

const store = new Map<string, PendingEntry>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - ENTRY_TTL_MS;
    for (const [id, entry] of store) {
      if (entry.createdAt < cutoff) store.delete(id);
    }
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function markPending(correlationId: string): void {
  store.set(correlationId, {
    status: "pending",
    result: null,
    createdAt: Date.now(),
  });
  ensureCleanup();
}

export function completeAnalysis(
  correlationId: string,
  result: AnalysisResult,
): boolean {
  const entry = store.get(correlationId);
  if (!entry) return false;
  entry.status = "completed";
  entry.result = result;
  return true;
}

export function getStatus(
  correlationId: string,
): { status: "pending" } | { status: "completed"; result: AnalysisResult } | null {
  const entry = store.get(correlationId);
  if (!entry) return null;
  if (entry.status === "completed" && entry.result) {
    return { status: "completed", result: entry.result };
  }
  return { status: "pending" };
}
