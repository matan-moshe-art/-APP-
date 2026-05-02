export function debugLog(input: {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  // #region agent log
  fetch("http://127.0.0.1:7549/ingest/e6a5982d-3e05-40a8-8ae0-f15bee2ba81f", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "8364dc",
    },
    body: JSON.stringify({
      sessionId: "8364dc",
      runId: input.runId,
      hypothesisId: input.hypothesisId,
      location: input.location,
      message: input.message,
      data: input.data ?? {},
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}
