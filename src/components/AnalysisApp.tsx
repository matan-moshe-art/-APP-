"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  inputModeFromSelection,
  isScamResult,
  isSummarizeResult,
  type AppResult,
  type InputMode,
  type SelectedFeature,
  type SelectedInputType,
} from "@/lib/app-types";
import { limitsForMode } from "@/lib/prompt-routing";

type ScamResult = {
  meaning: string;
  urgency: string;
  action: string;
  suspicious: string;
};

type SummarizeResult = {
  topic: string;
  urgency: string;
  actions: string;
  recommendations: string;
};

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

function ChoiceButton({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-emerald-500/60 bg-emerald-500/15 text-white"
          : "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60"
      }`}
    >
      {children}
    </button>
  );
}

function ResultBlock({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-right">
      <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-zinc-300">
        {body}
      </p>
    </section>
  );
}

function LoadingBar({ label }: { label: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      let next: number;
      if (elapsed < 8) next = (elapsed / 8) * 30;
      else if (elapsed < 23) next = 30 + ((elapsed - 8) / 15) * 60;
      else if (elapsed < 28) next = 90 + ((elapsed - 23) / 5) * 9;
      else next = 99;
      setProgress((prev) => Math.max(prev, Math.min(99, next)));
    }, 200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-8" aria-busy="true">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-zinc-500">{label}</p>
    </div>
  );
}

export default function AnalysisApp() {
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(
    null,
  );
  const [selectedInputType, setSelectedInputType] =
    useState<SelectedInputType | null>(null);
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfExtractedText, setPdfExtractedText] = useState("");
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [result, setResult] = useState<AppResult | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const locked = isAnalyzing || isPolling || result !== null;
  const inputMode: InputMode | null = inputModeFromSelection(selectedInputType);
  const textLimits = inputMode ? limitsForMode(inputMode) : null;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const resetAll = useCallback(() => {
    stopPolling();
    setSelectedFeature(null);
    setSelectedInputType(null);
    setUploadedPdf(null);
    setPdfFileName(null);
    setPdfExtractedText("");
    setInputText("");
    setIsAnalyzing(false);
    setResult(null);
    setValidation(null);
    setError(null);
    setErrorCode(null);
    setPdfLoading(false);
  }, [stopPolling]);

  const selectFeature = (feature: SelectedFeature) => {
    if (locked) return;
    setSelectedFeature(feature);
    setSelectedInputType(null);
    setUploadedPdf(null);
    setPdfFileName(null);
    setPdfExtractedText("");
    setInputText("");
    setResult(null);
    setValidation(null);
    setError(null);
    setErrorCode(null);
  };

  const selectInputType = (type: SelectedInputType) => {
    if (locked) return;
    setSelectedInputType(type);
    setValidation(null);
    if (type !== "pdf") {
      setUploadedPdf(null);
      setPdfFileName(null);
      setPdfExtractedText("");
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (locked) return;
    setValidation(null);
    setPdfLoading(true);
    setUploadedPdf(file);
    setPdfFileName(file.name);
    setSelectedInputType("pdf");

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/pdf-text", { method: "POST", body: form });
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as { message: unknown }).message === "string"
            ? (data as { message: string }).message
            : "לא הצלחנו לקרוא את ה-PDF.";
        setValidation(message);
        setUploadedPdf(null);
        setPdfFileName(null);
        setPdfExtractedText("");
        return;
      }

      if (
        data &&
        typeof data === "object" &&
        "text" in data &&
        typeof (data as { text: unknown }).text === "string"
      ) {
        setPdfExtractedText((data as { text: string }).text);
      }
    } catch {
      setValidation("לא הצלחנו לקרוא את ה-PDF. נסו שנית.");
      setUploadedPdf(null);
      setPdfFileName(null);
      setPdfExtractedText("");
    } finally {
      setPdfLoading(false);
    }
  };

  const startPolling = useCallback(
    (correlationId: string) => {
      stopPolling();
      setIsPolling(true);
      pollStartRef.current = Date.now();

      pollRef.current = setInterval(async () => {
        if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
          stopPolling();
          setIsAnalyzing(false);
          setError("העיבוד לוקח יותר מדי זמן. נסו שנית.");
          setErrorCode("AN-208");
          return;
        }

        try {
          const res = await fetch(`/api/analyze/status/${correlationId}`);
          const data: unknown = await res.json().catch(() => null);

          if (
            data &&
            typeof data === "object" &&
            "status" in data &&
            (data as { status: string }).status === "completed" &&
            "result" in data
          ) {
            const r = (data as { result: Record<string, unknown> }).result;
            setResult({
              meaning: String(r.meaning),
              urgency: String(r.urgency),
              action: String(r.action),
              suspicious: String(r.suspicious),
            });
            setIsAnalyzing(false);
            stopPolling();
          }
        } catch {
          /* keep polling */
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  const runAnalysis = async () => {
    setValidation(null);
    setError(null);
    setErrorCode(null);

    if (!selectedFeature) {
      setValidation("בחרו תחילה: סיכום או בדיקת הונאה.");
      return;
    }
    if (!selectedInputType) {
      setValidation("בחרו את סוג התוכן תחילה.");
      return;
    }

    const mode = inputModeFromSelection(selectedInputType);
    if (!mode) return;

    const limits = limitsForMode(mode);
    const coreText =
      selectedInputType === "pdf"
        ? pdfExtractedText.trim()
        : inputText.trim();
    const optionalNote =
      selectedInputType === "pdf" ? inputText.trim() : "";
    const combined =
      optionalNote.length > 0
        ? `${coreText}\n\n--- הקשר נוסף ---\n${optionalNote}`
        : coreText;

    if (!combined) {
      setValidation("הוסיפו הודעה או PDF לפני ההתחלה.");
      return;
    }
    if (selectedInputType === "pdf" && !pdfExtractedText.trim()) {
      setValidation("הוסיפו הודעה או PDF לפני ההתחלה.");
      return;
    }
    if (combined.length < limits.min) {
      setValidation("הטקסט קצר מדי לניתוח.");
      return;
    }
    if (combined.length > limits.max) {
      setValidation("הטקסט ארוך מדי. קצרו או העלו קובץ קטן יותר.");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("אין חיבור לאינטרנט. בדקו את החיבור ונסו שנית.");
      setErrorCode(selectedFeature === "scam" ? "AN-001" : "SM-001");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    const endpoint =
      selectedFeature === "scam" ? "/api/analyze" : "/api/summarize";
    const body = JSON.stringify({
      text: combined,
      inputType: mode,
    });

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        if (
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as { message: unknown }).message === "string"
        ) {
          setValidation((data as { message: string }).message);
          if (
            "eventCode" in data &&
            typeof (data as { eventCode: unknown }).eventCode === "string"
          ) {
            setErrorCode((data as { eventCode: string }).eventCode);
          }
        } else {
          setError("לא הצלחנו להשלים את הבקשה. נסו שנית.");
          setErrorCode(selectedFeature === "scam" ? "AN-500" : "SM-500");
        }
        setIsAnalyzing(false);
        return;
      }

      if (
        selectedFeature === "scam" &&
        data &&
        typeof data === "object" &&
        "accepted" in data &&
        (data as { accepted: unknown }).accepted === true &&
        "correlationId" in data &&
        typeof (data as { correlationId: unknown }).correlationId === "string"
      ) {
        startPolling((data as { correlationId: string }).correlationId);
        return;
      }

      if (selectedFeature === "scam" && isScamPayload(data)) {
        setResult(data);
        setIsAnalyzing(false);
        return;
      }

      if (selectedFeature === "summarizer" && isSummarizePayload(data)) {
        setResult(data);
        setIsAnalyzing(false);
        return;
      }

      setError("לא הצלחנו להשלים את הבקשה. נסו שנית.");
      setErrorCode(selectedFeature === "scam" ? "AN-501" : "SM-501");
      setIsAnalyzing(false);
    } catch {
      setError("אין חיבור לאינטרנט. בדקו את החיבור ונסו שנית.");
      setErrorCode(selectedFeature === "scam" ? "AN-002" : "SM-002");
      setIsAnalyzing(false);
    } finally {
      if (!pollRef.current && selectedFeature === "summarizer") {
        setIsAnalyzing(false);
      }
    }
  };

  const primaryLabel =
    selectedFeature === "summarizer" ? "צור סיכום" : "בדוק בטיחות";
  const loadingLabel =
    selectedFeature === "summarizer"
      ? "יוצר סיכום..."
      : "בודק בטיחות...";

  const showInputArea =
    selectedFeature !== null && selectedInputType !== null;
  const showShortOption =
    selectedInputType !== "pdf" && !uploadedPdf && !pdfFileName;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 text-right">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          הבנת הודעות ובדיקת הונאה
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          סיכום ברור או בדיקת סיכון פישינג — בעברית, בלי רעש.
        </p>
      </header>

      <div className="space-y-8 text-right">
        <section aria-labelledby="feature-heading">
          <h2
            id="feature-heading"
            className="mb-3 text-sm font-medium text-zinc-400"
          >
            מה תרצו לעשות?
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ChoiceButton
              selected={selectedFeature === "summarizer"}
              disabled={locked}
              onClick={() => selectFeature("summarizer")}
            >
              סיכום
            </ChoiceButton>
            <ChoiceButton
              selected={selectedFeature === "scam"}
              disabled={locked}
              onClick={() => selectFeature("scam")}
            >
              בדיקת הונאה
            </ChoiceButton>
          </div>
        </section>

        {selectedFeature ? (
          <section aria-labelledby="input-type-heading">
            <h2
              id="input-type-heading"
              className="mb-3 text-sm font-medium text-zinc-400"
            >
              סוג התוכן
            </h2>
            <div
              className={`grid grid-cols-1 gap-2 ${
                showShortOption ? "sm:grid-cols-3" : "sm:grid-cols-2"
              }`}
            >
              {showShortOption ? (
                <ChoiceButton
                  selected={selectedInputType === "short"}
                  disabled={locked}
                  onClick={() => selectInputType("short")}
                >
                  הודעה קצרה
                </ChoiceButton>
              ) : null}
              {selectedInputType !== "pdf" ? (
                <ChoiceButton
                  selected={selectedInputType === "long"}
                  disabled={locked}
                  onClick={() => selectInputType("long")}
                >
                  הודעה / מסמך ארוך
                </ChoiceButton>
              ) : null}
              <ChoiceButton
                selected={selectedInputType === "pdf"}
                disabled={locked}
                onClick={() => selectInputType("pdf")}
              >
                הוספת PDF
              </ChoiceButton>
            </div>
          </section>
        ) : null}

        {showInputArea ? (
          <section className="space-y-4">
            {selectedInputType === "pdf" ? (
              <div>
                <label
                  htmlFor="pdf-upload"
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 transition-colors ${
                    locked
                      ? "cursor-not-allowed border-zinc-800 bg-zinc-900/30 opacity-60"
                      : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-sm font-medium text-zinc-300">
                    {pdfFileName ?? "בחרו קובץ PDF"}
                  </span>
                  <span className="mt-1 text-xs text-zinc-500">
                    מטופל כמסמך ארוך
                  </span>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    disabled={locked || pdfLoading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handlePdfUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {pdfLoading ? (
                  <p className="mt-2 text-xs text-zinc-500">קורא את הקובץ...</p>
                ) : null}
                <label
                  htmlFor="pdf-context"
                  className="mt-4 block text-sm text-zinc-400"
                >
                  הקשר נוסף (אופציונלי)
                </label>
                <textarea
                  id="pdf-context"
                  dir="rtl"
                  rows={3}
                  disabled={locked}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (validation) setValidation(null);
                  }}
                  placeholder="הערה קצרה על המסמך, אם רלוונטי"
                  className="mt-2 w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none disabled:opacity-50"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="message-input" className="sr-only">
                  תוכן לניתוח
                </label>
                <textarea
                  id="message-input"
                  dir="rtl"
                  rows={10}
                  disabled={locked}
                  value={inputText}
                  maxLength={textLimits?.max ?? 80_000}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (validation) setValidation(null);
                  }}
                  placeholder={
                    selectedInputType === "short"
                      ? "הדביקו הודעה קצרה: SMS, וואטסאפ, התראה..."
                      : "הדביקו מייל, מסמך או טקסט ארוך..."
                  }
                  className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none disabled:opacity-50"
                />
                {textLimits ? (
                  <p className="mt-1 text-xs text-zinc-600">
                    {inputText.length.toLocaleString("he-IL")} /{" "}
                    {textLimits.max.toLocaleString("he-IL")}
                  </p>
                ) : null}
              </div>
            )}

            {validation ? (
              <p className="text-sm text-amber-200/90" role="alert">
                {validation}
                {errorCode ? (
                  <span className="me-2 font-mono text-xs text-zinc-500">
                    ({errorCode})
                  </span>
                ) : null}
              </p>
            ) : null}

            {!result ? (
              <button
                type="button"
                onClick={() => void runAnalysis()}
                disabled={isAnalyzing || isPolling}
                className="btn-primary w-full rounded-lg px-6 py-3.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {isAnalyzing || isPolling ? loadingLabel : primaryLabel}
              </button>
            ) : null}
          </section>
        ) : null}

        {(isAnalyzing || isPolling) && !result ? (
          <LoadingBar label={loadingLabel} />
        ) : null}

        {error ? (
          <div
            className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 text-right"
            role="alert"
          >
            <p className="text-sm text-zinc-300">{error}</p>
            {errorCode ? (
              <p className="mt-1 font-mono text-xs text-zinc-500">{errorCode}</p>
            ) : null}
            <button
              type="button"
              onClick={() => void runAnalysis()}
              className="btn-ghost mt-4 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200"
            >
              נסו שנית
            </button>
          </div>
        ) : null}

        {result && selectedFeature === "scam" && isScamResult("scam", result) ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">תוצאות הבדיקה</h2>
            <ResultBlock title="מה זה אומר" body={result.meaning} />
            <ResultBlock title="רמת דחיפות" body={result.urgency} />
            <ResultBlock title="מה לעשות עכשיו" body={result.action} />
            <ResultBlock title="סימנים חשודים" body={result.suspicious} />
            <button
              type="button"
              onClick={resetAll}
              className="btn-ghost mt-2 w-full rounded-lg border border-zinc-600 px-4 py-3 text-sm font-medium text-zinc-200 sm:w-auto"
            >
              התחלת ניתוח חדש
            </button>
          </div>
        ) : null}

        {result &&
        selectedFeature === "summarizer" &&
        isSummarizeResult("summarizer", result) ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">הסיכום</h2>
            <ResultBlock title="נושא עיקרי" body={result.topic} />
            <ResultBlock title="רמת דחיפות" body={result.urgency} />
            <ResultBlock title="פעולות חשובות" body={result.actions} />
            <ResultBlock title="המלצה" body={result.recommendations} />
            <button
              type="button"
              onClick={resetAll}
              className="btn-ghost mt-2 w-full rounded-lg border border-zinc-600 px-4 py-3 text-sm font-medium text-zinc-200 sm:w-auto"
            >
              התחלת ניתוח חדש
            </button>
          </div>
        ) : null}
      </div>

      <footer className="mt-16 border-t border-zinc-800 pt-6 text-center text-xs text-zinc-600">
        ההודעות והתשובות נשמרות לשיפור המודל. במקרה של ספק — אמתו מול הגוף הרשמי.
      </footer>
    </div>
  );
}

function isScamPayload(data: unknown): data is ScamResult {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.meaning === "string" &&
    typeof o.urgency === "string" &&
    typeof o.action === "string" &&
    typeof o.suspicious === "string"
  );
}

function isSummarizePayload(data: unknown): data is SummarizeResult {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.topic === "string" &&
    typeof o.urgency === "string" &&
    typeof o.actions === "string" &&
    typeof o.recommendations === "string"
  );
}
