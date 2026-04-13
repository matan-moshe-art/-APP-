"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Result = {
  meaning: string;
  urgency: string;
  action: string;
  suspicious: string;
};

const SECTIONS: {
  key: keyof Result;
  title: string;
  icon: string;
  accent: string;
  bar: string;
  stagger: string;
}[] = [
  {
    key: "meaning",
    title: "פירוש פשוט",
    icon: "💡",
    accent:
      "border-sky-200/60 bg-gradient-to-bl from-sky-50/90 to-white/90",
    bar: "bg-gradient-to-b from-sky-400 to-sky-600",
    stagger: "stagger-1",
  },
  {
    key: "urgency",
    title: "רמת דחיפות",
    icon: "⏰",
    accent:
      "border-orange-200/60 bg-gradient-to-bl from-orange-50/90 to-white/90",
    bar: "bg-gradient-to-b from-orange-400 to-orange-600",
    stagger: "stagger-2",
  },
  {
    key: "action",
    title: "מה לעשות עכשיו",
    icon: "✅",
    accent:
      "border-emerald-200/60 bg-gradient-to-bl from-emerald-50/90 to-white/90",
    bar: "bg-gradient-to-b from-emerald-400 to-emerald-600",
    stagger: "stagger-3",
  },
  {
    key: "suspicious",
    title: "מה נראה חשוד או חריג",
    icon: "🔍",
    accent:
      "border-amber-200/60 bg-gradient-to-bl from-amber-50/90 to-white/90",
    bar: "bg-gradient-to-b from-amber-400 to-amber-600",
    stagger: "stagger-4",
  },
];

function SkeletonCards() {
  return (
    <div className="mt-10 flex w-full flex-col gap-4" aria-busy="true">
      {SECTIONS.map((s) => (
        <div
          key={s.key}
          className={`animate-fade-in relative overflow-hidden rounded-2xl border p-5 shadow-md ${s.accent} ${s.stagger}`}
        >
          <div
            className={`absolute end-0 top-0 h-full w-1.5 rounded-full ${s.bar} opacity-60`}
            aria-hidden
          />
          <div className="shimmer-bg mb-3 h-5 w-40 rounded-lg" />
          <div className="space-y-2.5">
            <div className="shimmer-bg h-3.5 w-full rounded-lg" />
            <div className="shimmer-bg h-3.5 w-[92%] rounded-lg" />
            <div className="shimmer-bg h-3.5 w-4/5 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const PROGRESS_STEPS = [
  "קוראים את ההודעה...",
  "מזהים את סוג ההודעה...",
  "בודקים מי השולח...",
  "מנתחים את התוכן...",
  "בודקים אם יש תאריכי יעד...",
  "מחפשים סימנים חשודים...",
  "משווים מול דפוסים מוכרים...",
  "בודקים את רמת הדחיפות...",
  "מגבשים המלצות לפעולה...",
  "בודקים קישורים ופרטי קשר...",
  "מוודאים שלא חסר מידע חשוב...",
  "מנסחים את ההסבר בצורה ברורה...",
  "סוקרים הכל פעם אחרונה...",
  "כמעט מוכן, עוד רגע...",
];

function WaitingIndicator() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (stepIdx >= PROGRESS_STEPS.length - 1) return;
    const delay = 1800 + Math.random() * 1200;
    const timer = setTimeout(() => {
      setStepIdx((i) => Math.min(i + 1, PROGRESS_STEPS.length - 1));
    }, delay);
    return () => clearTimeout(timer);
  }, [stepIdx]);

  const progress = Math.round(
    ((stepIdx + 1) / PROGRESS_STEPS.length) * 100,
  );

  return (
    <div className="mt-10 flex w-full flex-col items-center gap-6 py-8">
      <div className="w-full max-w-xs">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-gradient-to-l from-sky-400 to-sky-600 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2 rounded-full bg-sky-500"
              style={{
                animation: "pulse 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <p
          className="text-center text-base font-medium text-stone-600"
          role="status"
          aria-live="polite"
        >
          {PROGRESS_STEPS[stepIdx]}
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  }, []);

  const resetOutputs = useCallback(() => {
    setResult(null);
    setError(null);
    setPolling(false);
    setShowResults(false);
    stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback(
    (correlationId: string) => {
      stopPolling();
      setPolling(true);
      pollStartRef.current = Date.now();

      pollRef.current = setInterval(async () => {
        if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
          stopPolling();
          setLoading(false);
          setError("העיבוד לוקח יותר מדי זמן. נסו שנית.");
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
            setLoading(false);
            stopPolling();
          }
        } catch {
          // network hiccup — keep polling
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const analyze = useCallback(async () => {
    setValidation(null);
    setError(null);
    const trimmed = text.trim();

    if (!trimmed) {
      setValidation("יש להדביק הודעה לפני הניתוח");
      resetOutputs();
      return;
    }
    if (trimmed.length < 10) {
      setValidation("ההודעה קצרה מדי לניתוח");
      resetOutputs();
      return;
    }
    if (trimmed.length > 5000) {
      setValidation(
        "ההודעה ארוכה מדי. נסו לקצר או להדביק את החלק העיקרי",
      );
      resetOutputs();
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("אין חיבור לאינטרנט. בדקו את החיבור ונסו שנית.");
      setShowResults(true);
      setResult(null);
      return;
    }

    setLoading(true);
    setShowResults(true);
    setResult(null);
    setError(null);
    setPolling(false);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
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
          setShowResults(false);
        } else {
          setError("משהו השתבש. נסו שנית בעוד כמה שניות.");
        }
        return;
      }

      if (
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

      if (
        data &&
        typeof data === "object" &&
        "meaning" in data &&
        "urgency" in data &&
        "action" in data &&
        "suspicious" in data
      ) {
        const d = data as Record<string, unknown>;
        setResult({
          meaning: String(d.meaning),
          urgency: String(d.urgency),
          action: String(d.action),
          suspicious: String(d.suspicious),
        });
      } else {
        setError("משהו השתבש. נסו שנית בעוד כמה שניות.");
      }
    } catch {
      setError("אין חיבור לאינטרנט. בדקו את החיבור ונסו שנית.");
    } finally {
      if (!pollRef.current) {
        setLoading(false);
      }
    }
  }, [text, resetOutputs, startPolling]);

  const clearAndReset = useCallback(() => {
    setText("");
    setValidation(null);
    setResult(null);
    setError(null);
    setPolling(false);
    setShowResults(false);
    stopPolling();
  }, [stopPolling]);

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto flex w-full max-w-[700px] flex-1 flex-col px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="animate-slide-down text-right">
          <div className="mb-1 flex items-center justify-end gap-3">
            <h1 className="bg-gradient-to-l from-sky-700 via-sky-600 to-indigo-600 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
              מנתח הודעות רשמיות
            </h1>
            <div className="animate-float flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-lg shadow-lg shadow-sky-500/20">
              🛡️
            </div>
          </div>
          <p className="mt-2 text-base leading-relaxed text-stone-600">
            הדביקו הודעה רשמית וקבלו הסבר פשוט, רמת דחיפות, מה לעשות, ומה
            חשוד
          </p>
          <p className="mt-1.5 text-sm text-stone-400">
            הכלי לא מספק ייעוץ משפטי. המטרה היא בהירות בלבד.
          </p>
        </header>

        {/* Input Card */}
        <section className="glass-strong animate-slide-up mt-8 rounded-2xl border border-white/60 p-4 shadow-xl shadow-stone-900/[0.04] ring-1 ring-stone-200/50 sm:p-6">
          <label htmlFor="message" className="sr-only">
            הודעה רשמית
          </label>
          <textarea
            id="message"
            dir="rtl"
            className="min-h-[200px] w-full resize-y rounded-xl border border-stone-200/80 bg-white/60 p-4 text-base leading-relaxed text-stone-900 placeholder:text-stone-400 focus:border-sky-400 focus:outline-none disabled:opacity-60"
            placeholder="הדביקו כאן את ההודעה הרשמית..."
            value={text}
            maxLength={5000}
            disabled={loading}
            onChange={(e) => {
              setText(e.target.value);
              if (validation) setValidation(null);
            }}
          />
          <div className="mt-2 flex justify-between text-xs text-stone-400">
            <span>{text.length} / 5000</span>
          </div>
          {validation ? (
            <p
              className="animate-scale-in mt-3 text-sm font-medium text-red-600"
              role="alert"
            >
              {validation}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
            <button
              type="button"
              onClick={analyze}
              disabled={loading}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {loading ? (
                <>
                  <span
                    className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden
                  />
                  מנתח...
                </>
              ) : (
                "נתח את ההודעה"
              )}
            </button>
            <button
              type="button"
              onClick={clearAndReset}
              disabled={loading}
              className="card-hover inline-flex w-full items-center justify-center rounded-xl border border-stone-200/80 bg-white/80 px-6 py-3.5 text-base font-medium text-stone-700 backdrop-blur-sm transition hover:bg-white disabled:opacity-50 sm:w-auto"
            >
              נקה ונתח מחדש
            </button>
          </div>
        </section>

        {/* Results Area */}
        {!showResults ? null : loading && !polling ? (
          <SkeletonCards />
        ) : polling ? (
          <WaitingIndicator />
        ) : error ? (
          <div
            className="animate-scale-in relative mt-10 overflow-hidden rounded-2xl border border-red-200/60 bg-gradient-to-bl from-red-50/90 to-white/90 p-5 text-right shadow-lg shadow-red-500/5"
            role="alert"
          >
            <div
              className="absolute end-0 top-0 h-full w-1.5 rounded-full bg-gradient-to-b from-red-400 to-red-600"
              aria-hidden
            />
            <h2 className="flex items-center justify-end gap-2 text-lg font-bold text-red-900">
              שגיאה
              <span className="text-xl">⚠️</span>
            </h2>
            <p className="mt-2 text-red-800">{error}</p>
          </div>
        ) : result ? (
          <div className="mt-10 flex w-full flex-col gap-4">
            {SECTIONS.map((s) => (
              <article
                key={s.key}
                className={`card-hover animate-slide-up relative overflow-hidden rounded-2xl border p-5 text-right shadow-md ${s.accent} ${s.stagger}`}
              >
                <div
                  className={`absolute end-0 top-0 h-full w-1.5 rounded-full ${s.bar}`}
                  aria-hidden
                />
                <h2 className="flex items-center justify-end gap-2 text-lg font-bold text-stone-900">
                  {s.title}
                  <span className="text-xl">{s.icon}</span>
                </h2>
                <div className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-stone-700">
                  {result[s.key]}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {/* Trust Footer */}
        <footer className="animate-fade-in mt-auto pt-12 pb-4 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
            <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
            <span>מאובטח ופרטי — הנתונים לא נשמרים</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
